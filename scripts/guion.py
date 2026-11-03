"""Utilidades compartidas: lee y valida guion.json (la única fuente del guion)."""
import json
import os
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RUTA_GUION = os.path.join(RAIZ, "guion.json")
DIR_AUDIO = os.path.join(RAIZ, "audio")
RUTA_TIMELINE = os.path.join(RAIZ, "src", "timeline.json")

PLANOS_BASE = {"WIDE", "SAMARIO", "CUP"}
TRANSICIONES = {"corte", "rapida", "normal", "lenta"}
# Gestos disponibles por personaje (deben existir en src/audio-sync.js)
GESTOS = {
    "Samario": {"asentir", "negar", "mirar_taza", "mirar_frente", "gesticular"},
    "Tostadito": {"saltar", "ladear", "temblar", "mirar_samario", "mirar_frente"},
}


def error(msg):
    sys.exit(f"Error en guion.json: {msg}")


def archivo_audio(indice, linea):
    """Nombre del MP3 de la línea (indice empieza en 0): 01_samario.mp3, 02_tostadito.mp3..."""
    return f"{indice + 1:02d}_{linea['personaje'].lower()}.mp3"


def camara_de(linea):
    """Devuelve las órdenes de cámara de la línea como lista [{en, plano, transicion}], o [] si no hay."""
    cam = linea.get("camara")
    if cam is None:
        return []
    if isinstance(cam, str):
        cam = [{"en": 0.0, "plano": cam}]
    return sorted(
        ({"en": float(c.get("en", 0.0)), "plano": c["plano"], "transicion": c.get("transicion", "normal")} for c in cam),
        key=lambda c: c["en"],
    )


def cargar_guion():
    if not os.path.isfile(RUTA_GUION):
        error(f"no existe {RUTA_GUION}")
    with open(RUTA_GUION, encoding="utf-8") as f:
        try:
            g = json.load(f)
        except json.JSONDecodeError as e:
            error(f"JSON inválido: {e}")

    personajes = g.get("personajes") or error("falta 'personajes'")
    lineas = g.get("lineas") or error("falta 'lineas' (o está vacía)")
    planos = PLANOS_BASE | set(g.get("planos", {}))

    for nombre, p in personajes.items():
        if not p.get("voz_id"):
            error(f"el personaje '{nombre}' no tiene 'voz_id'")
        if nombre not in GESTOS:
            error(f"personaje desconocido '{nombre}'. Disponibles: {', '.join(GESTOS)}")

    for n, linea in enumerate(lineas, 1):
        donde = f"línea {n}"
        if linea.get("personaje") not in personajes:
            error(f"{donde}: personaje '{linea.get('personaje')}' no está en 'personajes'")
        if not str(linea.get("texto", "")).strip():
            error(f"{donde}: falta 'texto'")
        try:
            cues = camara_de(linea)
        except (KeyError, TypeError, ValueError) as e:
            error(f"{donde}: 'camara' mal formada ({e!r})")
        for c in cues:
            if c["plano"] not in planos:
                error(f"{donde}: plano '{c['plano']}' no existe. Disponibles: {', '.join(sorted(planos))}")
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
