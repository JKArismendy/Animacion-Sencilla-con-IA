"""Motor de voz Chatterbox. Lo lanza generar_voces.py dentro de .venv (no ejecutar a mano).

Recibe un JSON de trabajos, clona la voz de cada sample de referencia, genera cada línea
en español y la guarda como MP3 (los demás scripts esperan MP3).
Por cada línea terminada imprime "HECHO<TAB>nombre" para que generar_voces.py actualice su manifiesto.
"""
import json
import os
import subprocess
import sys
import tempfile
import time


def main():
    with open(sys.argv[1], encoding="utf-8") as f:
        lote = json.load(f)

    import torch
    import torchaudio as ta
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Cargando modelo Chatterbox en {device} (la primera vez descarga varios GB)...", flush=True)

    model = ChatterboxMultilingualTTS.from_pretrained(device=device)

    for n, t in enumerate(lote["trabajos"], 1):
        inicio = time.time()
        print(f"[{n}/{len(lote['trabajos'])}] {t['nombre']}: {t['texto'][:60]}...", flush=True)
        torch.manual_seed(t["semilla"])
        wav = model.generate(
            t["texto"],
            language_id=lote.get("idioma", "es"),
            audio_prompt_path=t["referencia"],
            exaggeration=t["exaggeration"],
            cfg_weight=t["cfg_weight"],
        )
        with tempfile.TemporaryDirectory() as tmp:
            ruta_wav = os.path.join(tmp, "linea.wav")
            ta.save(ruta_wav, wav, model.sr)
            subprocess.run(
                ["ffmpeg", "-loglevel", "error", "-y", "-i", ruta_wav, "-codec:a", "libmp3lame", "-q:a", "2", t["salida"]],
                check=True,
            )
        print(f"    ({time.time() - inicio:.0f} s)", flush=True)
        print(f"HECHO\t{t['nombre']}", flush=True)


if __name__ == "__main__":
    main()
