"""Genera las pistas de voz de un guion de guiones/ (audio/<guion>/01_samario.mp3, 02_tostadito.mp3...).

Motores (campo "motor" de guion.json):
  chatterbox  voces clonadas localmente desde samples WAV (audio/referencia/). Sin API ni créditos.
  elevenlabs  API de ElevenLabs (necesita ELEVENLABS_API_KEY en .env y voces permitidas por tu plan).

Uso (desde cualquier carpeta):
    python scripts/generar_voces.py ratio-del-cafe            # genera solo las líneas nuevas o modificadas
    python scripts/generar_voces.py ratio-del-cafe --force    # regenera todo
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

from guion import RAIZ, archivo_audio, cargar_guion, elegir_guion, rutas, validar_motor

OUTPUT_FORMAT = "mp3_44100_128"
# Se fijan en main() según el guion elegido: audio/<guion>/ y su manifest.json
DIR_AUDIO = None
RUTA_MANIFIESTO = None


def cargar_env():
    """Lee el archivo .env de la raíz del proyecto (si existe) sin pisar variables ya definidas."""
    ruta = os.path.join(RAIZ, ".env")
    if not os.path.isfile(ruta):
        return
    with open(ruta, encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if not linea or linea.startswith("#") or "=" not in linea:
                continue
            clave, valor = linea.split("=", 1)
            os.environ.setdefault(clave.strip(), valor.strip().strip('"').strip("'"))


def ajustes_de_voz(personaje):
    return {
        "stability": personaje.get("stability", 0.5),
        "similarity_boost": personaje.get("similarity_boost", 0.8),
        "style": personaje.get("style", 0.0),
        "use_speaker_boost": True,
    }


def generar(api_key, modelo, personaje, texto, previo, siguiente):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{personaje['voz_id']}?output_format={OUTPUT_FORMAT}"
    body = {
        "text": texto,
        "model_id": modelo,
        "voice_settings": ajustes_de_voz(personaje),
        "language_code": "es",
    }
    # Contexto de las líneas vecinas para que la entonación sea coherente
    if previo:
        body["previous_text"] = previo
    if siguiente:
        body["next_text"] = siguiente
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    with urllib.request.urlopen(req) as resp:
        return resp.read()


def huella(*partes):
    """Identifica todo lo que afecta al audio: si no cambia, no se vuelve a generar."""
    datos = json.dumps(partes, sort_keys=True, ensure_ascii=False)
    return hashlib.sha1(datos.encode("utf-8")).hexdigest()


def hash_archivo(ruta):
    with open(ruta, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()


def guardar_manifiesto(manifiesto):
    with open(RUTA_MANIFIESTO, "w", encoding="utf-8") as f:
        json.dump(manifiesto, f, indent=2)


def python_del_venv():
    ruta = os.path.join(RAIZ, ".venv", "Scripts", "python.exe")
    if not os.path.isfile(ruta):
        ruta = os.path.join(RAIZ, ".venv", "bin", "python")   # Linux/Mac
    return ruta if os.path.isfile(ruta) else None


def pendientes(guion, motor, manifiesto, force):
    """Devuelve [(indice, linea, nombre, huella)] de las líneas que hay que generar."""
    lineas = guion["lineas"]
    modelo = guion.get("modelo", "eleven_multilingual_v2")
    salida = []
    for i, linea in enumerate(lineas):
        nombre = archivo_audio(i, linea)
        personaje = guion["personajes"][linea["personaje"]]
        if motor == "elevenlabs":
            previo = lineas[i - 1]["texto"] if i > 0 else None
            siguiente = lineas[i + 1]["texto"] if i < len(lineas) - 1 else None
            h = huella("elevenlabs", modelo, personaje, linea["texto"], previo, siguiente)
        else:
            h = huella("chatterbox", linea["texto"], hash_archivo(os.path.join(RAIZ, personaje["referencia"])),
                       personaje.get("exaggeration", 0.5), personaje.get("cfg_weight", 0.5),
                       personaje.get("semilla", 42) + i)
        if not force and os.path.exists(os.path.join(DIR_AUDIO, nombre)) and manifiesto.get(nombre) == h:
            print(f" -> Sin cambios: {nombre}")
            continue
        salida.append((i, linea, nombre, h))
    return salida


def generar_elevenlabs(guion, trabajos, manifiesto):
    cargar_env()
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        sys.exit("Falta ELEVENLABS_API_KEY (ponla en el archivo .env de la raíz del proyecto)")
    modelo = guion.get("modelo", "eleven_multilingual_v2")
    lineas = guion["lineas"]
    gastados = 0
    for i, linea, nombre, h in trabajos:
        personaje = guion["personajes"][linea["personaje"]]
        previo = lineas[i - 1]["texto"] if i > 0 else None
        siguiente = lineas[i + 1]["texto"] if i < len(lineas) - 1 else None
        try:
            audio = generar(api_key, modelo, personaje, linea["texto"], previo, siguiente)
        except urllib.error.HTTPError as e:
            sys.exit(f"Error {e.code} en {nombre}: {e.read().decode('utf-8', 'ignore')}")
        with open(os.path.join(DIR_AUDIO, nombre), "wb") as f:
            f.write(audio)
        manifiesto[nombre] = h
        gastados += len(linea["texto"])
        print(f" -> Generado: {nombre} (~{len(linea['texto'])} créditos)")
        guardar_manifiesto(manifiesto)   # lo ya generado no se repite si algo falla
    print(f"Créditos aproximados usados: {gastados}.")


def generar_chatterbox(guion, trabajos, manifiesto):
    py = python_del_venv()
    if not py:
        sys.exit("No existe el entorno de Chatterbox (.venv). Mira el README: sección 'Voces con Chatterbox'.")
    lote = []
    for i, linea, nombre, h in trabajos:
        p = guion["personajes"][linea["personaje"]]
        lote.append({
            "nombre": nombre,
            "texto": linea["texto"],
            "referencia": os.path.join(RAIZ, p["referencia"]),
            "salida": os.path.join(DIR_AUDIO, nombre),
            "exaggeration": p.get("exaggeration", 0.5),
            "cfg_weight": p.get("cfg_weight", 0.5),
            "semilla": p.get("semilla", 42) + i,
        })
    huellas = {t[2]: t[3] for t in trabajos}
    ruta_lote = os.path.join(DIR_AUDIO, "_lote_chatterbox.json")
    with open(ruta_lote, "w", encoding="utf-8") as f:
        json.dump({"idioma": guion.get("idioma", "es"), "trabajos": lote}, f, ensure_ascii=False, indent=2)
    try:
        proc = subprocess.Popen(
            [py, os.path.join(RAIZ, "scripts", "motor_chatterbox.py"), ruta_lote],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
            env={**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUNBUFFERED": "1", "TQDM_DISABLE": "1", "PYTHONWARNINGS": "ignore"},
        )
        for salida in proc.stdout:
            salida = salida.rstrip()
            if salida.startswith("HECHO	"):
                nombre = salida.split("	", 1)[1]
                manifiesto[nombre] = huellas[nombre]
                guardar_manifiesto(manifiesto)   # lo ya generado no se repite si algo falla
                print(f" -> Generado: {nombre}")
            else:
                print(f"    {salida}")
        if proc.wait() != 0:
            sys.exit("Chatterbox terminó con error (ver mensajes arriba).")
    finally:
        if os.path.exists(ruta_lote):
            os.remove(ruta_lote)


def main():
    global DIR_AUDIO, RUTA_MANIFIESTO
    force = "--force" in sys.argv
    nombre_guion = elegir_guion(sys.argv)
    DIR_AUDIO = rutas(nombre_guion)[1]
    RUTA_MANIFIESTO = os.path.join(DIR_AUDIO, "manifest.json")
    guion = cargar_guion(nombre_guion)
    motor = validar_motor(guion)
    os.makedirs(DIR_AUDIO, exist_ok=True)

    manifiesto = {}
    if os.path.isfile(RUTA_MANIFIESTO):
        with open(RUTA_MANIFIESTO, encoding="utf-8") as f:
            manifiesto = json.load(f)

    print(f"Generando voces de '{guion.get('titulo', 'guion')}' ({len(guion['lineas'])} líneas, motor {motor})...")
    trabajos = pendientes(guion, motor, manifiesto, force)
    if not trabajos:
        print("Nada que generar.")
        return
    if motor == "elevenlabs":
        generar_elevenlabs(guion, trabajos, manifiesto)
    else:
        generar_chatterbox(guion, trabajos, manifiesto)
    print("Listo.")


if __name__ == "__main__":
    main()
