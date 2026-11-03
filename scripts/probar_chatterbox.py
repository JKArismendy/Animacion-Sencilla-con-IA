"""Pantalla web local para probar Chatterbox (clonar voz y escuchar el resultado).

Ejecutar con el entorno de Chatterbox, desde la raíz del proyecto:
    .venv\\Scripts\\python scripts\\probar_chatterbox.py

Se abre en el navegador (http://127.0.0.1:7860). Todo corre en tu equipo.
"""
import os
import subprocess
import tempfile

import gradio as gr
import torch
import torchaudio as ta
from chatterbox.mtl_tts import SUPPORTED_LANGUAGES, ChatterboxMultilingualTTS

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIR_REF = os.path.join(RAIZ, "audio", "referencia")

_modelo = None


def modelo():
    global _modelo
    if _modelo is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Cargando Chatterbox en {device}...", flush=True)
        _modelo = ChatterboxMultilingualTTS.from_pretrained(device=device)
    return _modelo


def generar(texto, referencia, exaggeration, cfg_weight, semilla, idioma):
    if not texto or not texto.strip():
        raise gr.Error("Escribe un texto.")
    if not referencia:
        raise gr.Error("Graba o sube primero tu voz de referencia.")
    m = modelo()
    torch.manual_seed(int(semilla))
    wav = m.generate(
        texto.strip(),
        language_id=idioma,
        audio_prompt_path=referencia,
        exaggeration=float(exaggeration),
        cfg_weight=float(cfg_weight),
    )
    return (m.sr, wav.squeeze(0).cpu().numpy())


def guardar_sample(referencia, personaje):
    """Convierte la grabación a WAV mono y la guarda como sample de un personaje."""
    if not referencia:
        raise gr.Error("Primero graba o sube un audio.")
    os.makedirs(DIR_REF, exist_ok=True)
    destino = os.path.join(DIR_REF, f"{personaje.lower()}.wav")
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", referencia, "-ac", "1", destino],
        check=True,
    )
    return f"Guardado: audio/referencia/{personaje.lower()}.wav"


with gr.Blocks(title="Chatterbox - prueba de voz") as demo:
    gr.Markdown(
        "# Chatterbox: clona tu voz\n"
        "1. **Graba** (micrófono) o **sube** un audio tuyo de 10 a 20 s, en español.\n"
        "2. Escribe un texto y pulsa **Generar**.\n"
        "3. Si te gusta tu grabación, guárdala como sample de **Samario** o **Tostadito**.\n\n"
        "_En CPU cada frase tarda de decenas de segundos a un par de minutos._"
    )
    with gr.Row():
        with gr.Column():
            referencia = gr.Audio(sources=["microphone", "upload"], type="filepath", label="Tu voz de referencia")
            with gr.Row():
                personaje = gr.Dropdown(["Samario", "Tostadito"], value="Samario", label="Guardar como sample de")
                btn_guardar = gr.Button("Guardar sample")
            estado = gr.Textbox(label="", interactive=False)
        with gr.Column():
            texto = gr.Textbox(
                label="Texto a decir", lines=4,
                value="Tu paladar manda, no la báscula.",
            )
            idioma = gr.Dropdown(
                choices=[(f"{n} ({c})", c) for c, n in SUPPORTED_LANGUAGES.items()], value="es", label="Idioma",
            )
            exaggeration = gr.Slider(0.25, 2.0, value=0.5, step=0.05, label="Expresividad (exaggeration)")
            cfg_weight = gr.Slider(0.0, 1.0, value=0.5, step=0.05, label="Ritmo (cfg_weight; más bajo = más pausado)")
            semilla = gr.Number(value=42, precision=0, label="Semilla (misma semilla = mismo resultado)")
            btn = gr.Button("Generar", variant="primary")
            salida = gr.Audio(label="Resultado", type="numpy")

    btn.click(generar, [texto, referencia, exaggeration, cfg_weight, semilla, idioma], salida)
    btn_guardar.click(guardar_sample, [referencia, personaje], estado)

if __name__ == "__main__":
    demo.launch(server_name="127.0.0.1", inbrowser=True)
