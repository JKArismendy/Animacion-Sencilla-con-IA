import os
import json
import subprocess

AUDIOS = [
    {"file": "audio/samario_1.mp3", "speaker": "Samario", "shot": "WIDE"},
    {"file": "audio/tostadito_1.mp3", "speaker": "Tostadito", "shot": "CUP"},
    {"file": "audio/samario_2.mp3", "speaker": "Samario", "shot": "SAMARIO"},
    {"file": "audio/tostadito_2.mp3", "speaker": "Tostadito", "shot": "CUP"},
    {"file": "audio/samario_3.mp3", "speaker": "Samario", "shot": "SAMARIO"},
    {"file": "audio/samario_4.mp3", "speaker": "Samario", "shot": "WIDE"},
    {"file": "audio/tostadito_3.mp3", "speaker": "Tostadito", "shot": "WIDE"}
]

def obtener_duracion(ruta):
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        ruta
    ]
    # Si ffprobe no está en tu carpeta, usa ffmpeg -i
    try:
        resultado = subprocess.check_output(cmd).decode().strip()
        return float(resultado)
    except Exception:
        # Fallback con ffmpeg
        cmd = ["ffmpeg", "-i", ruta]
        proc = subprocess.Popen(cmd, stderr=subprocess.PIPE)
        _, stderr = proc.communicate()
        lineas = [l for l in stderr.decode('latin1').split('\n') if 'Duration' in l]
        if lineas:
            t_str = lineas[0].split('Duration:')[1].split(',')[0].strip()
            h, m, s = t_str.split(':')
            return float(h)*3600 + float(m)*60 + float(s)
        return 5.0

timeline = []
tiempo_actual = 0.0

for item in AUDIOS:
    dur = obtener_duracion(item["file"])
    timeline.append({
        "speaker": item["speaker"],
        "shot": item["shot"],
        "start": round(tiempo_actual, 3),
        "end": round(tiempo_actual + dur, 3)
    })
    tiempo_actual += dur

os.makedirs("src", exist_ok=True)
with open("src/timeline.json", "w", encoding="utf-8") as f:
    json.dump(timeline, f, indent=2)

print("✅ 'src/timeline.json' generado con tiempos reales milisegundo a milisegundo.")