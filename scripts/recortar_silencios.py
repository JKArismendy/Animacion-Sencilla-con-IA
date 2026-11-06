"""Quita el silencio sobrante al inicio y al final de cada voz de un guion, para que el
cambio de un personaje a otro sea inmediato (ritmo de TikTok/Reels).

    python scripts/recortar_silencios.py guion01

Es idempotente: volver a correrlo sobre voces ya recortadas no cambia nada relevante.
Deja un respiro mínimo (COLA) para que las palabras no suenen cortadas.
"""
import os
import subprocess
import sys

from guion import archivo_audio, cargar_guion, elegir_guion, rutas

UMBRAL = "-40dB"        # silencio al inicio (conservador: no se come el arranque de las palabras)
UMBRAL_FINAL = "-35dB"  # silencio al final (más estricto: quita soplidos y colas de ruido)
INICIO = 0.03      # segundos de silencio que se conservan al inicio
COLA = 0.08        # segundos de silencio que se conservan al final

FILTRO = (
    f"silenceremove=start_periods=1:start_threshold={UMBRAL}:start_silence={INICIO},"
    "areverse,"
    f"silenceremove=start_periods=1:start_threshold={UMBRAL_FINAL}:start_silence={COLA},"
    "areverse"
)


def main():
    nombre = elegir_guion(sys.argv)
    dir_audio = rutas(nombre)[1]
    lineas = cargar_guion(nombre)["lineas"]
    print("Recortando silencios de las voces...")
    for i, linea in enumerate(lineas):
        archivo = archivo_audio(i, linea)
        ruta = os.path.join(dir_audio, archivo)
        if not os.path.exists(ruta):
            sys.exit(f"Falta {ruta}. Ejecuta primero generar_voces.py")
        tmp = os.path.join(dir_audio, "_recorte_" + archivo)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", ruta, "-af", FILTRO,
             "-c:a", "libmp3lame", "-q:a", "2", tmp],
            check=True,
        )
        os.replace(tmp, ruta)
        print(f"  {archivo}")


if __name__ == "__main__":
    main()
