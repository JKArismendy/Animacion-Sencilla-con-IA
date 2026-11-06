"""Utilidades compartidas: lee y valida un guion de guiones/<nombre>.json (la única fuente de cada guion).

Todo lo que se genera de un guion vive en audio/<nombre>/ (voces, audio_completo.mp3,
manifest.json y timeline.json), así que varios guiones no se pisan entre sí.
"""
import json
import os
import subprocess
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIR_GUIONES = os.path.join(RAIZ, "guiones")
DIR_AUDIO_BASE = os.path.join(RAIZ, "audio")

# Segundos de plano final que se dejan tras la última palabra (silencio al final del audio)
COLA_FINAL = 1.5

MOTORES = {"chatterbox", "elevenlabs"}
PLANOS_BASE = {"WIDE", "SAMARIO", "CUP"}
TRANSICIONES = {"corte", "rapida", "normal", "lenta"}
# Hacia dónde mira quien habla en una línea (auto = comportamiento automático)
MIRADAS = {"auto", "camara", "companero", "pensando"}
# Opciones de una orden de cámara (además de 'en' y 'transicion')
OPCIONES_CAMARA = ("plano", "zoom", "dura", "inclinacion", "orbita")
# Gestos disponibles por personaje (deben existir en src/audio-sync.js)
GESTOS = {
    "Samario": {"asentir", "negar", "mirar_taza", "mirar_frente", "gesticular"},
    "Tostadito": {"saltar", "ladear", "temblar", "mirar_samario", "mirar_frente"},
}


def error(msg):
    sys.exit(f"Error en el guion: {msg}")


def listar_guiones():
    """Nombres (sin .json) de los guiones que hay en guiones/."""
    if not os.path.isdir(DIR_GUIONES):
        return []
    return sorted(f[:-5] for f in os.listdir(DIR_GUIONES) if f.endswith(".json"))


def elegir_guion(argv):
    """Nombre del guion pedido por línea de comandos (primer argumento que no sea una opción).

    Si no se indica y solo existe uno, usa ese. Si hay varios, pide que se elija.
    """
    pedidos = [a for a in argv[1:] if not a.startswith("--")]
    existentes = listar_guiones()
    if pedidos:
        nombre = pedidos[0][:-5] if pedidos[0].endswith(".json") else pedidos[0]
        if nombre not in existentes:
            sys.exit(f"No existe el guion '{nombre}'. Disponibles: {', '.join(existentes) or '(ninguno)'}")
        return nombre
    if len(existentes) == 1:
        return existentes[0]
    sys.exit(f"Indica qué guion usar. Disponibles: {', '.join(existentes) or '(ninguno)'}")


def rutas(nombre):
    """Rutas de un guion: (archivo del guion, carpeta de audio, timeline.json)."""
    dir_audio = os.path.join(DIR_AUDIO_BASE, nombre)
    return os.path.join(DIR_GUIONES, nombre + ".json"), dir_audio, os.path.join(dir_audio, "timeline.json")


def archivo_audio(indice, linea):
    """Nombre del MP3 de la línea (indice empieza en 0): 01_samario.mp3, 02_tostadito.mp3..."""
    return f"{indice + 1:02d}_{linea['personaje'].lower()}.mp3"


def camara_de(linea):
    """Devuelve las órdenes de cámara de la línea como lista de dicts, o [] si no hay.

    Cada orden: en, transicion y, solo si se indican, plano, zoom, dura, inclinacion, orbita.
    """
    cam = linea.get("camara")
    if cam is None:
        return []
    if isinstance(cam, str):
        cam = [{"en": 0.0, "plano": cam}]
    elif isinstance(cam, dict):
        cam = [cam]
    cues = []
    for c in cam:
        cue = {"en": float(c.get("en", 0.0)), "transicion": c.get("transicion", "normal")}
        for k in OPCIONES_CAMARA:
            if c.get(k) is not None:
                cue[k] = c[k] if k == "plano" else float(c[k])
        if not any(k in cue for k in OPCIONES_CAMARA if k != "dura"):
            raise ValueError("indica al menos 'plano', 'zoom', 'inclinacion' u 'orbita'")
        extra = set(c) - set(OPCIONES_CAMARA) - {"en", "transicion"}
        if extra:
            raise ValueError(f"claves desconocidas {sorted(extra)}")
        cues.append(cue)
    return sorted(cues, key=lambda c: c["en"])


def obtener_duracion(ruta):
    """Duración en segundos de un archivo de audio (ffprobe)."""
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", ruta]
    try:
        return float(subprocess.check_output(cmd).decode().strip())
    except Exception:
        sys.exit(f"No se pudo medir la duración de {ruta}")


def calcular_inicios(lineas, duraciones):
    """Segundo en que empieza cada línea.

    Cada una arranca al terminar la anterior, más su 'pausa' (silencio previo) y menos su
    'solapar' (segundos que se mete encima de la anterior). Nunca antes de 0.
    """
    inicios, fin_anterior = [], 0.0
    for linea, dur in zip(lineas, duraciones):
        inicio = max(0.0, fin_anterior + float(linea.get("pausa", 0)) - float(linea.get("solapar", 0)))
        inicios.append(inicio)
        fin_anterior = inicio + dur
    return inicios


def cargar_guion(nombre):
    ruta = rutas(nombre)[0]
    if not os.path.isfile(ruta):
        error(f"no existe {ruta}")
    with open(ruta, encoding="utf-8") as f:
        try:
            g = json.load(f)
        except json.JSONDecodeError as e:
            error(f"JSON inválido: {e}")

    personajes = g.get("personajes") or error("falta 'personajes'")
    lineas = g.get("lineas") or error("falta 'lineas' (o está vacía)")
    planos = PLANOS_BASE | set(g.get("planos", {}))

    if g.get("motor", "chatterbox") not in MOTORES:
        error(f"'motor' debe ser uno de: {', '.join(sorted(MOTORES))}")

    for nombre, p in personajes.items():
        if nombre not in GESTOS:
            error(f"personaje desconocido '{nombre}'. Disponibles: {', '.join(GESTOS)}")

    for n, linea in enumerate(lineas, 1):
        donde = f"línea {n}"
        if linea.get("personaje") not in personajes:
            error(f"{donde}: personaje '{linea.get('personaje')}' no está en 'personajes'")
        if not str(linea.get("texto", "")).strip():
            error(f"{donde}: falta 'texto'")
        if linea.get("mirada", "auto") not in MIRADAS:
            error(f"{donde}: 'mirada' debe ser una de: {', '.join(sorted(MIRADAS))}")
        for campo in ("pausa", "solapar"):
            try:
                if float(linea.get(campo, 0)) < 0:
                    raise ValueError
            except (TypeError, ValueError):
                error(f"{donde}: '{campo}' debe ser un número de segundos mayor o igual a 0")
        try:
            cues = camara_de(linea)
        except (KeyError, TypeError, ValueError) as e:
            error(f"{donde}: 'camara' mal formada ({e!r})")
        for c in cues:
            if "plano" in c and c["plano"] not in planos:
                error(f"{donde}: plano '{c['plano']}' no existe. Disponibles: {', '.join(sorted(planos))}")
            if "zoom" in c and not 0.25 <= c["zoom"] <= 4.0:
                error(f"{donde}: 'zoom' debe estar entre 0.25 y 4 (1 = normal, 2 = el doble de cerca), no {c['zoom']}")
            if "dura" in c and c["dura"] <= 0:
                error(f"{donde}: 'dura' debe ser mayor que 0 (segundos)")
            if c["transicion"] not in TRANSICIONES:
                error(f"{donde}: transición '{c['transicion']}' no válida. Usa: {', '.join(sorted(TRANSICIONES))}")
            if not 0.0 <= c["en"] <= 1.0:
                error(f"{donde}: 'en' debe estar entre 0 y 1 (fracción de la línea), no {c['en']}")
        for a in linea.get("acciones", []):
            quien = a.get("quien", linea["personaje"])
            if quien not in GESTOS:
                error(f"{donde}: acción para personaje desconocido '{quien}'")
            if a.get("gesto") not in GESTOS[quien]:
                error(f"{donde}: gesto '{a.get('gesto')}' no válido para {quien}. Usa: {', '.join(sorted(GESTOS[quien]))}")
            if not 0.0 <= float(a.get("en", 0.0)) <= 1.0:
                error(f"{donde}: 'en' de una acción debe estar entre 0 y 1")
    return g


def validar_motor(g):
    """Comprueba lo que exige el motor de voz elegido (solo lo necesita generar_voces.py)."""
    motor = g.get("motor", "chatterbox")
    for nombre, p in g["personajes"].items():
        if motor == "elevenlabs" and not p.get("voz_id"):
            error(f"el personaje '{nombre}' no tiene 'voz_id' (necesario con motor elevenlabs)")
        if motor == "chatterbox":
            ref = p.get("referencia")
            if not ref:
                error(f"el personaje '{nombre}' no tiene 'referencia' (WAV con su voz, para motor chatterbox)")
            if not os.path.isfile(os.path.join(RAIZ, ref)):
                error(f"no existe el sample de {nombre}: {ref}. Grábalo y ponlo en esa ruta")
    return motor
