import os
import subprocess

DIALOGOS = [
    "lucas_1.mp3",
    "tostadito_1.mp3",
    "lucas_2.mp3",
    "tostadito_2.mp3",
    "lucas_3.mp3",
    "lucas_4.mp3",
    "tostadito_3.mp3"
]

# Crear lista para concatenación directa en FFmpeg
with open("lista_audios.txt", "w", encoding="utf-8") as f:
    for audio in DIALOGOS:
        if os.path.exists(audio):
            f.write(f"file '{audio}'\n")
        else:
            print(f"⚠️ Falta {audio}")

# Generar audio unificado
cmd = [
    "ffmpeg", "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", "lista_audios.txt",
    "-c:a", "libmp3lame",
    "-q:a", "2",
    "audio_completo.mp3"
]

print("🎙️ Uniendo diálogos de forma secuencial...")
subprocess.run(cmd, check=True)
print("✅ Archivo 'audio_completo.mp3' creado sin solapamientos.")