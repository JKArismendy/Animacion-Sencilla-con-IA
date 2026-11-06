"""Une las pistas de voz de un guion en audio/<guion>/audio_completo.mp3, respetando
la 'pausa' y el 'solapar' de cada línea (ver calcular_inicios en guion.py)."""
import os
import subprocess
import sys

from guion import (COLA_FINAL, archivo_audio, calcular_inicios, cargar_guion,
                   elegir_guion, obtener_duracion, rutas)


def main():
    nombre = elegir_guion(sys.argv)
    DIR_AUDIO = rutas(nombre)[1]
    lineas = cargar_guion(nombre)["lineas"]
    nombres = [archivo_audio(i, l) for i, l in enumerate(lineas)]
    faltan = [n for n in nombres if not os.path.exists(os.path.join(DIR_AUDIO, n))]
    if faltan:
        sys.exit(f"Faltan audios: {', '.join(faltan)}. Ejecuta primero generar_voces.py")

    duraciones = [obtener_duracion(os.path.join(DIR_AUDIO, n)) for n in nombres]
    inicios = calcular_inicios(lineas, duraciones)

    cmd = ["ffmpeg", "-y"]
    filtros = []
    for i, (n, ini) in enumerate(zip(nombres, inicios)):
        cmd += ["-i", n]
        ms = round(ini * 1000)
        filtros.append(f"[{i}:a]adelay={ms}:all=1[a{i}]")
    entradas = "".join(f"[a{i}]" for i in range(len(nombres)))
    filtros.append(f"{entradas}amix=inputs={len(nombres)}:normalize=0:duration=longest,"
                   f"apad=pad_dur={COLA_FINAL}[out]")
    cmd += ["-filter_complex", ";".join(filtros), "-map", "[out]",
            "-c:a", "libmp3lame", "-q:a", "2", "audio_completo.mp3"]

    print("Uniendo diálogos...")
    subprocess.run(cmd, check=True, cwd=DIR_AUDIO)
    print(f"Archivo 'audio/{nombre}/audio_completo.mp3' creado.")


if __name__ == "__main__":
    main()
