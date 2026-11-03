import asyncio
import edge_tts

# Voces seleccionadas
VOICE_LUCAS = "es-CO-GonzaloNeural"     # Tono cálido, barista
VOICE_TOSTADITO = "es-CO-SalomeNeural"    # Voz expresiva (o es-MX-DaliaNeural)

# Guion desglosado con nombres de archivo
DIALOGOS = [
    {
        "file": "lucas_1.mp3",
        "voice": VOICE_LUCAS,
        "pitch": "+0Hz",
        "rate": "+0%",
        "text": "¿Por qué la gente cree que hacer buen café es un examen de cálculo universitario?"
    },
    {
        "file": "tostadito_1.mp3",
        "voice": VOICE_TOSTADITO,
        "pitch": "+18Hz",  # Pitch más alto para efecto animado
        "rate": "+5%",
        "text": "¡Total! Me dicen 'usa un ratio 1:16 con extracción de dos minutos'... ¡y yo solo quería que me tomaran rico en el desayuno!"
    },
    {
        "file": "lucas_2.mp3",
        "voice": VOICE_LUCAS,
        "pitch": "+0Hz",
        "rate": "+0%",
        "text": "El ratio no es física cuántica. Es exactamente igual a cocinar arroz o ponerle sal a una sopa."
    },
    {
        "file": "tostadito_2.mp3",
        "voice": VOICE_TOSTADITO,
        "pitch": "+18Hz",
        "rate": "+5%",
        "text": "Básicamente, el ratio es cuántos amigos invito a la taza: si vienen pocos, la fiesta muere."
    },
    {
        "file": "lucas_3.mp3",
        "voice": VOICE_LUCAS,
        "pitch": "+0Hz",
        "rate": "+0%",
        "text": "Regla de oro estándar: por cada cucharada sopera colmada de café, una taza normal de agua."
    },
    {
        "file": "lucas_4.mp3",
        "voice": VOICE_LUCAS,
        "pitch": "+0Hz",
        "rate": "+0%",
        "text": "Tu paladar manda, no la báscula."
    },
    {
        "file": "tostadito_3.mp3",
        "voice": VOICE_TOSTADITO,
        "pitch": "+18Hz",
        "rate": "+5%",
        "text": "¡Y no me dejen enfriar en el mesón! Comenta cómo lo preparas tú en casa."
    }
]

async def generar_audios():
    print("🎙️ Generando pistas de voz con Edge-TTS...")
    for item in DIALOGOS:
        communicate = edge_tts.Communicate(
            text=item["text"],
            voice=item["voice"],
            pitch=item["pitch"],
            rate=item["rate"]
        )
        await communicate.save(item["file"])
        print(f" -> Guardado: {item['file']}")
    print("✅ Todas las voces generadas con éxito.")

if __name__ == "__main__":
    asyncio.run(generar_audios())