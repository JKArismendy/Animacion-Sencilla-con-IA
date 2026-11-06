"""Mide cada pista de voz y genera audio/<guion>/timeline.json con tiempos reales:
líneas (quién habla y qué dice), movimientos de cámara y gestos de los personajes."""
import json
import os
import sys

from guion import (COLA_FINAL, archivo_audio, calcular_inicios, camara_de, cargar_guion,
                   elegir_guion, obtener_duracion, rutas)


def main():
    nombre = elegir_guion(sys.argv)
    _, DIR_AUDIO, RUTA_TIMELINE = rutas(nombre)
    guion = cargar_guion(nombre)
    lineas_out, camara, acciones = [], [], []
    rutas_audio = [os.path.join(DIR_AUDIO, archivo_audio(i, l)) for i, l in enumerate(guion["lineas"])]
    for ruta in rutas_audio:
        if not os.path.exists(ruta):
            sys.exit(f"Falta {ruta}. Ejecuta primero generar_voces.py")
    duraciones = [obtener_duracion(r) for r in rutas_audio]
    inicios = calcular_inicios(guion["lineas"], duraciones)
    t_fin = 0.0

    for linea, dur, t in zip(guion["lineas"], duraciones, inicios):

        lineas_out.append({
            "speaker": linea["personaje"],
            "texto": linea["texto"],
            "mirada": linea.get("mirada", "auto"),
            "start": round(t, 3),
            "end": round(t + dur, 3),
        })
        for c in camara_de(linea):
            orden = {k: v for k, v in c.items() if k != "en"}
            camara.append({"t": round(t + c["en"] * dur, 3), **orden})
        for a in linea.get("acciones", []):
            inicio = t + float(a.get("en", 0.0)) * dur
            acciones.append({
                "quien": a.get("quien", linea["personaje"]),
                "gesto": a["gesto"],
                "start": round(inicio, 3),
                "end": round(inicio + float(a.get("dura", 1.0)), 3),
                "fuerza": float(a.get("fuerza", 1.0)),
            })
        t_fin = max(t_fin, t + dur)

    camara.sort(key=lambda c: c["t"])
    if not camara or camara[0]["t"] > 0:
        camara.insert(0, {"t": 0.0, "plano": "WIDE", "transicion": "normal"})

    os.makedirs(os.path.dirname(RUTA_TIMELINE), exist_ok=True)
    with open(RUTA_TIMELINE, "w", encoding="utf-8") as f:
        json.dump({
            "titulo": guion.get("titulo", ""),
            "duracion": round(t_fin + COLA_FINAL, 3),
            "planos": guion.get("planos", {}),
            "lineas": lineas_out,
            "camara": camara,
            "acciones": acciones,
        }, f, indent=2, ensure_ascii=False)

    print(f"'audio/{nombre}/timeline.json' generado: {len(lineas_out)} líneas, {round(t_fin, 1)} s.")


if __name__ == "__main__":
    main()
