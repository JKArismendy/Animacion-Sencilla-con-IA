"""Genera las pistas de voz de guion.json con ElevenLabs (audio/01_samario.mp3, 02_tostadito.mp3...).

Uso (desde cualquier carpeta):
    python scripts/generar_voces.py            # genera solo las líneas nuevas o modificadas
    python scripts/generar_voces.py --force    # regenera todo (gasta créditos)

Necesita ELEVENLABS_API_KEY en un archivo .env en la raíz del proyecto
(o como variable de entorno). Sin dependencias externas.
"""
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request

from guion import DIR_AUDIO, RAIZ, archivo_audio, cargar_guion

OUTPUT_FORMAT = "mp3_44100_128"
RUTA_MANIFIESTO = os.path.join(DIR_AUDIO, "manifest.json")


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


def huella(modelo, personaje, texto, previo, siguiente):
    """Identifica todo lo que afecta al audio: si no cambia, no se vuelve a generar."""
    datos = json.dumps([modelo, personaje, texto, previo, siguiente], sort_keys=True, ensure_ascii=False)
    return hashlib.sha1(datos.encode("utf-8")).hexdigest()


def main():
    force = "--force" in sys.argv
    cargar_env()
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        sys.exit("Falta ELEVENLABS_API_KEY (ponla en el archivo .env de la raíz del proyecto)")

    guion = cargar_guion()
    modelo = guion.get("modelo", "eleven_multilingual_v2")
    lineas = guion["lineas"]
    os.makedirs(DIR_AUDIO, exist_ok=True)

    manifiesto = {}
    if os.path.isfile(RUTA_MANIFIESTO):
        with open(RUTA_MANIFIESTO, encoding="utf-8") as f:
            manifiesto = json.load(f)

    print(f"Generando voces de '{guion.get('titulo', 'guion')}' ({len(lineas)} líneas, modelo {modelo})...")
    gastados = 0
    for i, linea in enumerate(lineas):
        nombre = archivo_audio(i, linea)
        ruta = os.path.join(DIR_AUDIO, nombre)
        personaje = guion["personajes"][linea["personaje"]]
        previo = lineas[i - 1]["texto"] if i > 0 else None
        siguiente = lineas[i + 1]["texto"] if i < len(lineas) - 1 else None
        h = huella(modelo, personaje, linea["texto"], previo, siguiente)

        if not force and os.path.exists(ruta) and manifiesto.get(nombre) == h:
            print(f" -> Sin cambios: {nombre}")
            continue
        try:
            audio = generar(api_key, modelo, personaje, linea["texto"], previo, siguiente)
        except urllib.error.HTTPError as e:
            sys.exit(f"Error {e.code} en {nombre}: {e.read().decode('utf-8', 'ignore')}")
        with open(ruta, "wb") as f:
            f.write(audio)
        manifiesto[nombre] = h
        gastados += len(linea["texto"])
        print(f" -> Generado: {nombre} (~{len(linea['texto'])} créditos)")
        # Guarda el manifiesto línea a línea: si algo falla, lo ya generado no se repite
        with open(RUTA_MANIFIESTO, "w", encoding="utf-8") as f:
            json.dump(manifiesto, f, indent=2)

    print(f"Listo. Créditos aproximados usados: {gastados}.")


if __name__ == "__main__":
    main()
