---
name: coffeetales
description: Conocimiento completo del proyecto CoffeeTales (cortos 3D verticales con Samario y Tostadito hechos con Three.js, guion en guion.json, voces clonadas con Chatterbox, cámara y gestos guionizados). Úsalo al trabajar en este repositorio (lucasYTostaito): cambiar el guion, voces, cámara, gestos, personajes, escena, subtítulos, grabar el video o depurar la página.
---

# CoffeeTales: guía del proyecto

Generador de cortos animados verticales (1080 × 1920, Reels/TikTok/Shorts) hecho enteramente con código. Dos personajes, **Samario** (barista) y **Tostadito** (taza parlante), conversan en una cafetería. La página 3D (Three.js r128, sin build ni Node) reproduce un audio, anima a los personajes según ese audio y lo graba a `.webm`. El README.md tiene la documentación para usuarios; este archivo es la guía para quien modifica el proyecto.

El nombre de la carpeta (`lucasYTostaito`) es histórico: el barista se llamaba Lucas y se renombró a Samario. **No debe quedar ninguna mención a "Lucas" en el código.** No renombres la carpeta.

## Idea central: un solo guion, todo derivado

`guion.json` es la **única fuente del guion**: quién habla, qué dice, cámara y gestos. Todo lo demás se deriva:

```
guion.json ──► generar_voces.py ──► audio/NN_personaje.mp3
                                         │
                  unir_audios.py ◄───────┘──► audio/audio_completo.mp3
                  medir_tiempos.py ──────────► src/timeline.json   (el navegador lee SOLO esto)
```

- **Nunca edites `src/timeline.json` a mano**: se regenera con `medir_tiempos.py`. Si cambias `guion.json`, ejecuta `python scripts/construir.py`.
- `index.html` hace `fetch('./src/timeline.json')`, por eso la página **debe servirse por HTTP** (`python -m http.server 8000`); con doble clic sobre el archivo no funciona.
- La página reproduce `audio/audio_completo.mp3`. Si falta, la página no arranca: no hay audio que la mueva.

## Mapa de archivos

| Ruta | Qué es |
|---|---|
| `guion.json` | Guion, motor de voz, personajes (samples y ajustes), planos de cámara propios |
| `index.html` | Renderer 1080×1920, postprocesado (bloom + film grain), botón de grabar, bucle `animate()` |
| `src/audio-sync.js` | Carga `timeline.json`, lee el volumen (Web Audio) y anima a ambos personajes; aplica los gestos del guion |
| `src/camera.js` | Planos `WIDE`, `SAMARIO`, `CUP` (+ los de `guion.json`), transiciones y cámara en mano |
| `src/subtitles.js` | Subtítulos dibujados dentro del canvas (se graban en el video) |
| `src/scene.js` | Escenografía de la cafetería (`setupScene()`); `scene-base.js` es un respaldo |
| `models/samario.js`, `models/tostadito.js` | Personajes; los `*-base.js` son respaldos originales |
| `scripts/` | Python: `guion.py` (carga y valida), `generar_voces.py`, `motor_chatterbox.py`, `unir_audios.py`, `medir_tiempos.py`, `construir.py` (los tres en orden), `probar_chatterbox.py` (pantalla de prueba) |
| `audio/` | MP3 generados, `manifest.json`, `referencia/` (samples WAV). No guardes respaldos dentro de `audio/`: el usuario los quiere fuera; solo debe haber archivos en uso |
| `docs/ILUMINACION.md` | Esquema de luces con valores y ubicación en el código. **Parcialmente desactualizado**: el código manda (alcance de las lámparas colgantes `1.5` en `src/scene.js:324`, no `3.5`; `kickerLeft` `0x1485e0` en `src/scene.js:264`, no `0x1D4ED8`). Verifica siempre contra `src/scene.js` |
| `docs/esquema de luces video.jpg` | Diagrama técnico (planta, lateral, leyenda) dibujado con Pillow desde ILUMINACION.md; hereda sus 2 diferencias; alturas de personajes y `warmLight` aproximadas. El script que lo dibuja no está en el repo |
| `esquema de luces Video.jpg` (raíz) | Ilustración generada con IA, solo orientativa: sus valores NO son fiables |

## Formato de `guion.json`

- Raíz: `titulo`, `motor` (`"chatterbox"` por defecto o `"elevenlabs"`), `idioma` (`"es"`), `planos` (opcional), `personajes`, `lineas`.
- `personajes.<Nombre>`: para Chatterbox `referencia` (ruta al WAV desde la raíz), `exaggeration` (0.5 neutro; más alto = más emotivo), `cfg_weight` (0.5; más bajo = más pausado), `semilla`. Para ElevenLabs `voz_id`, `stability`, `similarity_boost`, `style`.
- `lineas[]`: `personaje`, `texto`, `camara` (opcional), `acciones` (opcional).
- **`camara`**: un nombre de plano (`"CUP"`) o una lista `[{en, plano, transicion}]`. `en` es la **fracción de la línea** (0 = inicio, 0.5 = mitad, 1 = final), no segundos, porque la duración real del audio cambia al regenerar. Sin `camara`, la cámara se queda en el último plano. Transiciones: `corte` (1.0), `rapida` (0.16), `normal` (0.08, por defecto), `lenta` (0.03); son la fracción del trayecto recorrida por fotograma.
- **Movimientos de cámara** (opciones extra de cada cue, todas opcionales): `zoom` (multiplica el campo de visión: FOV = 40/zoom; 0.25–4), `dura` (segundos, interpolación suave por tiempo del audio en vez de por fotograma), `orbita` (grados alrededor del punto de mira), `inclinacion` (roll en grados), y `plano` es opcional (si falta se conserva el actual). Cada cue define el estado completo: lo omitido vuelve a zoom 1, órbita 0, inclinación 0. `camara` también acepta un solo objeto sin lista. Implementado en `src/camera.js` (`update(cue, time)`), validado en `scripts/guion.py` (`OPCIONES_CAMARA`) y copiado a `timeline.json` por `medir_tiempos.py`. Dos cues con el mismo `en` se pisan: el último gana.
- **`planos`** propios: `"NOMBRE": { "pos": [x,y,z], "mira": [x,y,z] }`.
- **`acciones`**: `{en, dura, quien, gesto, fuerza}`. `en` es fracción de la línea; **`dura` es en segundos** (1 por defecto); `quien` por defecto es el que habla; `fuerza` 1 = normal.
- **Gestos válidos**: Samario → `asentir`, `negar`, `mirar_taza`, `mirar_frente`, `gesticular`. Tostadito → `saltar`, `ladear`, `temblar`, `mirar_samario`, `mirar_frente`.
- `guion.py` valida todo y falla con el número de línea. Los audios se nombran por posición: `01_samario.mp3`, `02_tostadito.mp3`…

## Cómo funciona la animación (src/audio-sync.js)

Cada fotograma, `updateActors(t, samario, tostadito)`:
1. Busca la línea activa en `timeline.lineas` (quién habla).
2. Lee el volumen: `AnalyserNode` FFT 256, promedio de los primeros 32 bins (escala 0–255); umbral **80** en `getAudioVolume()`. Chatterbox deja ruido de fondo en las pausas (analizador ~25, hasta ~70; habla 100–190), por eso un umbral bajo (12) mantenía las bocas moviéndose entre frases.
3. Calcula objetivos automáticos (el que habla gira hacia el otro y mueve la boca; el que escucha asiente; pausas con saltito de Tostadito cada 3.5 s).
4. Aplica **encima** los gestos de `timeline.acciones` activos en ese instante.
5. Interpola suavemente (factor ~0.09) y llama a los métodos del modelo; devuelve el plano de cámara vigente (`getShotAt`), que `index.html` pasa a `updateCam(plano, transicion)`.

API de los modelos: Samario `setJawOpen(v)`, `setHeadAngles(rotY, rotX, breath)`, `setArmGesture(angle)`; Tostadito `setMouthScale(s)`, `setBounce(y)`, `setOrientation(rotY, tiltZ)`. Ambos tienen animaciones propias autónomas (parpadeo, miradas, cejas, respiración, vapor). Los planos de cámara actuales: `WIDE` pos (0, 1.55, 4.4); `SAMARIO` pos (-0.52, 1.82, 2.2); `CUP` pos (0.42, 1.30, 1.8); FOV 40.

## Voces (motor Chatterbox, por defecto)

- Cada personaje tiene un **sample WAV del propio usuario** en `audio/referencia/` (`samario.wav`, `tostadito.wav`; 10-20 s, español, mono, sin saturar). Chatterbox clona el estilo del sample: la actuación del sample es lo que más pesa en el resultado.
- Corre **en CPU** (la GPU del usuario es AMD, sin CUDA). Unos 20-60 s por línea. Necesita **Python 3.11** en `.venv` (el Python del sistema es 3.15 y no sirve para torch/Chatterbox). `generar_voces.py` lanza `motor_chatterbox.py` con el Python de `.venv`.
- `generar_voces.py` solo regenera líneas cuya huella cambió (texto, sample, parámetros, semilla); la huella se guarda en `audio/manifest.json`. `--force` regenera todo. La semilla efectiva es `semilla + índice de línea`.
- `python scripts/probar_chatterbox.py` (con el Python de `.venv`) abre una pantalla web en `http://127.0.0.1:7860` con micrófono, sliders y botón "Guardar sample". Es la forma de afinar `exaggeration`/`cfg_weight` antes de copiarlos a `guion.json`.
- ElevenLabs es un motor opcional. Con plan gratuito **no permite voces de la librería por API** (error 402); la clave va en `.env` (`ELEVENLABS_API_KEY`).

## Comandos habituales

```bash
python -m http.server 8000                 # ver/grabar: http://localhost:8000 (Ctrl+F5 tras cambios)
python scripts/construir.py                # voces + unir + tiempos (solo regenera lo que cambió)
python scripts/construir.py --force        # regenera todas las voces
.venv\Scripts\python scripts\probar_chatterbox.py   # pantalla de prueba de voces
ffmpeg -i CoffeeTales_Animacion3D.webm -vf fps=30 -c:v libx264 -crf 18 -c:a aac CoffeeTales_Final.mp4   # fps=30: cadencia constante
```

Los scripts usan rutas relativas a su propia ubicación, así que se pueden lanzar desde cualquier carpeta.

## Grabación y postprocesado

- `index.html` graba con `renderer.domElement.captureStream(30)` + `MediaRecorder` (VP9/Opus, 12 Mbps) y descarga un `.webm`. **30 es un máximo**: si el equipo renderiza más lento a 1080×1920, el `.webm` trae menos fotogramas y con cadencia irregular. Al convertir a mp4 usa siempre `-vf fps=30` para cadencia constante (repite fotogramas si faltan; no crea imagen nueva). Para medir los fps reales: `ffprobe -count_packets` y dividir `nb_read_packets` entre la duración.
- Postprocesado en `index.html` (queda grabado en el video): `UnrealBloomPass` (0.35, 0.45, 0.75), `FilmPass` (0.18, 0.025, 648, false), tone mapping ACES Filmic con exposición 1.05. Los subtítulos se dibujan después (sin filtros).

## Recetas

- **Historia nueva**: edita `lineas` en `guion.json` y ejecuta `construir.py`. No hay que tocar JS ni otros scripts. Decorado, textos de la escena y personajes siguen siendo los de la cafetería.
- **Cambio de voz**: regraba/sustituye el WAV de `audio/referencia/` o ajusta sliders y semilla en `guion.json`; `construir.py` regenera solo lo afectado.
- **Plano de cámara nuevo**: añádelo a `planos` en `guion.json` y úsalo por nombre. (Los tres planos base viven en `src/camera.js`).
- **Gesto nuevo**: añade el `case` en el `switch` de `src/audio-sync.js` **y** el nombre al diccionario `GESTOS` de `scripts/guion.py` (si no, el validador lo rechaza). Si el gesto necesita un movimiento que el modelo no tiene, primero hay que exponer un método en `models/`.
- **Personaje nuevo**: no es solo configuración. Hay que crear el modelo, añadirlo a la escena en `index.html`, tratarlo en `audio-sync.js` (hoy `isSamarioTurn`/`isCupTurn` están fijos) y registrarlo en `GESTOS` de `guion.py`.
- **Subtítulos**: el texto sale de `timeline.json`; el estilo (tamaño, zona segura al 72 % de la altura, máx. 6 palabras por fragmento) está en `src/subtitles.js`.

## Trampas y convenciones

- Sistema del usuario: Windows 11, PowerShell/Git Bash. Python del sistema 3.15 (solo biblioteca estándar en los scripts); Chatterbox solo funciona dentro de `.venv` (3.11).
- Los factores de interpolación de la cámara y los actores son **por fotograma**: dependen de la tasa de refresco.
- Si no hay `audio/audio_completo.mp3` o `timeline.json` está desactualizado, la página falla o se desincroniza: ejecuta `construir.py`.
- Nombres de archivos de audio: `NN_personaje.mp3` en minúsculas; el WAV de Tostadito es `tostadito.wav` (con "d").
- Los scripts de voces no dependen de librerías externas salvo `motor_chatterbox.py` y `probar_chatterbox.py` (solo en `.venv`).
- Idioma del proyecto: español (documentación, mensajes, comentarios).

## Cómo trabaja el usuario (preferencias)

- **Haz solo lo que se pide.** No añadas funciones, opciones ni carpetas que no pidió; si algo parece útil, propónlo y espera. Si ya lo hiciste y se queja, ofrece deshacerlo.
- **No toques las voces sin pedirlo:** los parámetros de `guion.json` (exaggeration, cfg_weight, semilla) y los samples son decisión suya. Una semilla distinta no arregla un problema de ritmo o expresividad; eso se afina en `probar_chatterbox.py`.
- Regenerar voces es lento (≈40–100 s por línea en CPU): lánzalo en segundo plano y avisa; el usuario escucha y aprueba antes del siguiente paso.
- Los commits y el merge los decide y hace él (o los pide expresamente).
- Borrar archivos solo cuando lo pide; entonces hazlo sin dejar copias.

## Seguridad y datos

- **Nunca** imprimas, registres ni subas `.env` (clave de ElevenLabs). Está en `.gitignore`, igual que `.venv/` y `ffmpeg.exe`.
- `audio/referencia/*.wav` es la voz grabada del usuario: no la compartas ni la subas sin que lo decida.
- Clona solo voces que el usuario tenga derecho a clonar (las suyas).

## Verificación tras un cambio

1. `python scripts/construir.py` termina sin errores (valida también el guion).
2. Servir con `python -m http.server 8000`, abrir con Ctrl+F5 y comprobar: arranca, las bocas se mueven, los subtítulos coinciden con el audio, los cambios de cámara ocurren donde indica el guion.
3. Si tocaste código JS, revisa la consola del navegador (F12). No hay tests automáticos.
4. `grep -ri lucas` debe seguir sin resultados (salvo `.git` y la ruta de la carpeta).
