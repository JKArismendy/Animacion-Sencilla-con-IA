"""Une las pistas de voz de guion.json, en orden, en audio/audio_completo.mp3."""
import os
import subprocess
import sys

from guion import DIR_AUDIO, archivo_audio, cargar_guion


def main():
    lineas = cargar_guion()["lineas"]
    nombres = [archivo_audio(i, l) for i, l in enumerate(lineas)]
    faltan = [n for n in nombres if not os.path.exists(os.path.join(DIR_AUDIO, n))]
    if faltan:
        sys.exit(f"Faltan audios: {', '.join(faltan)}. Ejecuta primero generar_voces.py")

    lista = os.path.join(DIR_AUDIO, "lista_audios.txt")
    with open(lista, "w", encoding="utf-8") as f:
        for n in nombres:
            f.write(f"file '{n}'\n")

    print("Uniendo diálogos de forma secuencial...")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "lista_audios.txt",
             "-c:a", "libmp3lame", "-q:a", "2", "audio_completo.mp3"],
            check=True, cwd=DIR_AUDIO,
        )
    finally:
        os.remove(lista)
    print("Archivo 'audio/audio_completo.mp3' creado.")


if __name__ == "__main__":
    main()
