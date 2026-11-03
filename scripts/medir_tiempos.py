"""Mide cada pista de voz y genera src/timeline.json con tiempos reales:
líneas (quién habla y qué dice), movimientos de cámara y gestos de los personajes."""
import json
import os
import subprocess
import sys

from guion import DIR_AUDIO, RUTA_TIMELINE, archivo_audio, camara_de, cargar_guion


def obtener_duracion(ruta):
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        ruta,
    ]
    try:
        return float(subprocess.check_output(cmd).decode().strip())
    except Exception:
        # Fallback con ffmpeg
        proc = subprocess.Popen(["ffmpeg", "-i", ruta], stderr=subprocess.PIPE)
        _, stderr = proc.communicate()
        lineas = [l for l in stderr.decode("latin1").split("\n") if "Duration" in l]
        if lineas:
            h, m, s = lineas[0].split("Duration:")[1].split(",")[0].strip().split(":")
            return float(h) * 3600 + float(m) * 60 + float(s)
        sys.exit(f"No se pudo medir la duración de {ruta}")


def main():
    guion = cargar_guion()
    lineas_out, camara, acciones = [], [], []
    t = 0.0

    for i, linea in enumerate(guion["lineas"]):
        ruta = os.path.join(DIR_AUDIO, archivo_audio(i, linea))
        if not os.path.exists(ruta):
            sys.exit(f"Falta {ruta}. Ejecuta primero generar_voces.py")
        dur = obtener_duracion(ruta)

        lineas_out.append({
            "speaker": linea["personaje"],
            "texto": linea["texto"],
            "start": round(t, 3),
            "end": round(t + dur, 3),
        })
        for c in camara_de(linea):
            camara.append({"t": round(t + c["en"] * dur, 3), "plano": c["plano"], "transicion": c["transicion"]})
        for a in linea.get("acciones", []):
            inicio = t + float(a.get("en", 0.0)) * dur
            acciones.append({
                "quien": a.get("quien", linea["personaje"]),
                "gesto": a["gesto"],
                "start": round(inicio, 3),
                "end": round(inicio + float(a.get("dura", 1.0)), 3),
                "fuerza": float(a.get("fuerza", 1.0)),
            })
        t += dur

    camara.sort(key=lambda c: c["t"])
    if not camara or camara[0]["t"] > 0:
        camara.insert(0, {"t": 0.0, "plano": "WIDE", "transicion": "normal"})

    os.makedirs(os.path.dirname(RUTA_TIMELINE), exist_ok=True)
    with open(RUTA_TIMELINE, "w", encoding="utf-8") as f:
        json.dump({
            "titulo": guion.get("titulo", ""),
            "duracion": round(t, 3),
            "planos": guion.get("planos", {}),
            "lineas": lineas_out,
            "camara": camara,
            "acciones": acciones,
        }, f, indent=2, ensure_ascii=False)

    print(f"'src/timeline.json' generado: {len(lineas_out)} líneas, {round(t, 1)} s.")


if __name__ == "__main__":
    main()
