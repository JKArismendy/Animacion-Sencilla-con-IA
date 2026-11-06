# CoffeeTales · Motor 3D cinemático

Generador de cortos animados verticales (1080 × 1920, formato Reels/TikTok/Shorts) hecho enteramente con código. Dos personajes conversan en una cafetería sobre cómo preparar un buen café: **Samario**, el barista, y **Tostadito**, una taza parlante. Las voces las generas tú: grabas un sample de tu propia voz para cada personaje y la clonación corre en tu equipo (Chatterbox), con sliders para controlar la expresividad. La animación se sincroniza con el audio en tiempo real y el resultado se graba directamente desde el navegador.

Todo el proyecto corre en el navegador: no hay *build*, ni *bundler*, ni dependencias de Node.

## Qué se hizo

- **Personajes low-poly/voxel** construidos por código con geometrías de Three.js:
  - *Samario*: busto con pelo de cubitos instanciados, gafas gruesas, boca de franja que cambia de forma al hablar, parpadeo, miradas variadas y un brazo apoyado en la barra con mano de dedos articulados.
  - *Tostadito*: taza de 12 caras con biseles, café hundido con luz cálida y vapor de cubitos, cara con la misma lógica expresiva que Samario.
- **Animación guiada por el audio**: el volumen de la voz abre la boca; la línea de tiempo decide quién habla, hacia dónde gira cada personaje y qué plano de cámara se usa.
- **Escenografía de cafetería** estilo pixel-art: pared de ladrillo, pizarra de menú, ventanas, lámparas, estantes con bolsas de café y métodos de preparación, barra trasera con máquina de espresso y barra principal con madera texturizada y letrero del local.
- **Cámara cinematográfica** con tres planos (general, Samario y taza) y movimiento de cámara en mano.
- **Postprocesado**: resplandor (*bloom*) y grano de película.
- **Subtítulos incrustados en el video**, dibujados dentro del canvas y colocados en la zona segura de Instagram.
- **Esquema de iluminación documentado**: ver [docs/ILUMINACION.md](docs/ILUMINACION.md).

## Herramientas y explicación técnica

| Herramienta | Para qué se usa | Cómo |
|---|---|---|
| **Three.js r128** (CDN) | Motor 3D | Escena, cámara perspectiva, luces, materiales `MeshStandardMaterial` con `flatShading` para el aspecto facetado, `InstancedMesh` para el pelo de Samario, `LatheGeometry` para la taza |
| **EffectComposer** (Three.js examples) | Cadena de postprocesado | `RenderPass` → `UnrealBloomPass` (fuerza 0.35, radio 0.45, umbral 0.75) → `FilmPass` (grano 0.18) |
| **ACES Filmic tone mapping** | Aspecto cinematográfico | `renderer.toneMapping` con exposición 1.05 y sombras suaves `PCFSoftShadowMap` |
| **ES Modules** | Organización del código | `index.html` importa la escena elegida (`escenas/*.js`), `camera.js`, `audio-sync.js`, `subtitles.js` y los modelos con `import` |
| **Web Audio API** | Lectura del volumen | `AnalyserNode` (FFT 256) sobre las frecuencias de la voz; ese valor mueve las bocas |
| **Canvas 2D + `CanvasTexture`** | Texturas y subtítulos procedurales | Ladrillo, madera, pizarra, etiquetas, café y letrero se dibujan por código; los subtítulos se dibujan en una capa ortográfica sobre el render |
| **`captureStream` + `MediaRecorder`** | Grabación del video | Captura el canvas a 30 fps junto con el audio, en VP9/Opus a 12 Mbps, y descarga un `.webm` |
| **Chatterbox** (local) | Voces | Clona la voz de un sample WAV por personaje (`audio/referencia/`) y genera los diálogos en tu PC, sin API ni créditos |
| **ElevenLabs** (API, opcional) | Voces | Motor alternativo (`"motor": "elevenlabs"` en el guion); la clave va en `.env` y su plan debe permitir las voces elegidas |
| **FFmpeg / FFprobe** | Audio y video | Une los diálogos, mide duraciones y convierte el `.webm` final a `.mp4` |

### Cómo funciona la sincronización

1. `medir_tiempos.py` mide cada pista con FFprobe y convierte el guion elegido en `audio/<guion>/timeline.json` (líneas, cambios de cámara y gestos con tiempos reales). `audio-sync.js` carga ese archivo al elegir el guion en la página.
2. En cada fotograma, con `audio.currentTime` se busca el tramo activo, se lee el volumen y se llama a los métodos de cada personaje (`setJawOpen`, `setHeadAngles`, `setMouthScale`, `setOrientation`…).
3. Cada modelo suma por su cuenta animaciones autónomas: parpadeo, cambios de mirada, cejas, respiración, movimiento del brazo y vapor.
4. La cámara recibe el plano activo y se desplaza suavemente hacia él, con una pequeña vibración de cámara en mano.
5. Los subtítulos usan la misma línea de tiempo y se parten en fragmentos cortos.

## Cómo usarlo

### 1. Ver y grabar el video

Los módulos ES no funcionan abriendo el archivo con doble clic; hay que servir la carpeta por HTTP:

```bash
python scripts/servidor.py
```

Abre `http://localhost:8000`, elige el **guion** (de `guiones/`) y la **escena** (de `escenas/`) en los selectores, pulsa **Iniciar / Grabar Video 3D** y espera a que termine el audio. El navegador descarga `CoffeeTales_<guion>.webm`. Un guion marcado "(sin audios)" aún no se ha construido: ejecuta `python scripts/construir.py <guion>`. Hace falta conexión a internet para cargar Three.js desde el CDN.

### 2. Convertir a MP4

```bash
ffmpeg -i CoffeeTales_Animacion3D.webm -vf fps=30 -c:v libx264 -crf 18 -c:a aac CoffeeTales_Final.mp4
```

`-vf fps=30` fuerza **30 fotogramas por segundo constantes**. Es necesario porque el `.webm` del navegador tiene una cadencia irregular: `captureStream(30)` captura *como máximo* 30 fps, y si el equipo renderiza más lento a 1080 × 1920 con bloom y grano, el archivo trae menos fotogramas. Sin ese filtro, ffmpeg elige la cadencia por su cuenta y el mp4 puede quedar con menos fotogramas de los que se veían en el navegador.

> Esto fija la cadencia pero no inventa imagen nueva: si el navegador solo renderizó, por ejemplo, 20 fps reales, el mp4 tendrá 30 fps con fotogramas repetidos. Para ver los fps reales de la grabación: `ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets:format=duration -of default=nw=1 CoffeeTales_Animacion3D.webm` (fps = `nb_read_packets` ÷ `duration`).

### 3. Voces con Chatterbox (local)

Las voces salen de **tus propias grabaciones**. Grabas un sample de voz por personaje, Chatterbox lo clona en tu equipo y, con unos deslizadores, controlas cómo suena. Sin API, sin cuentas ni créditos, y todo el control es tuyo. No hay que "subir" nada a ningún sitio: el WAV se usa directamente en cada generación.

**1. Crea el entorno (una sola vez).** Chatterbox necesita Python 3.11 (el del sistema puede ser más nuevo) y corre en CPU si no tienes GPU NVIDIA:

```bash
winget install Python.Python.3.11
py -3.11 -m venv .venv
.venv\Scripts\pip install -r scripts/requirements-chatterbox.txt
```

La primera vez descarga el modelo (unos GB).

**2. Graba tus samples** (o hazlo desde la pantalla de prueba del paso 3) y guárdalos como `audio/referencia/samario.wav` y `audio/referencia/tostadito.wav`:
- 10 a 20 segundos cada uno (mínimo ~6), en **español**, un solo hablante, sitio silencioso, sin música ni eco.
- Volumen moderado: que el pico no llegue a 0 dB, porque la saturación se nota en la voz clonada.
- Samario: tu voz natural. Tostadito: actúa la voz (aguda, animada, con energía). Chatterbox imita el estilo del sample, así que la actuación del sample es lo que más influye.
- WAV mono. Si tu grabadora da m4a/mp3, conviértelo: `ffmpeg -i grabacion.m4a -ac 1 samario.wav`.

**3. Pantalla de prueba con deslizadores.** Para escuchar y afinar antes de generar el episodio:

```bash
.venv\Scripts\python scripts\probar_chatterbox.py
```

Abre `http://127.0.0.1:7860`. Ahí puedes grabar con el micrófono (o subir un audio), escribir un texto y pulsar **Generar**. Los deslizadores controlan el resultado:

| Control | Qué hace |
|---|---|
| **Expresividad** (`exaggeration`) | 0.5 es neutro; más alto = más emotivo y exagerado. |
| **Ritmo** (`cfg_weight`) | 0.5 es normal; más bajo = habla más pausada. |
| **Semilla** | La misma semilla da el mismo resultado; cámbiala si quieres otra versión de la misma frase. |

El botón **Guardar sample** guarda tu grabación directamente en `audio/referencia/` como el sample de Samario o de Tostadito.

**4. Lleva tus valores al guion.** Cuando algo te guste, copia los valores a tu guion de `guiones/`, en cada personaje: `referencia`, `exaggeration`, `cfg_weight` y, si quieres, `semilla`. Cada línea usa una semilla fija, así que regenerar da el mismo resultado.

#### Alternativa: ElevenLabs (opcional)

Con `"motor": "elevenlabs"` en el guion las voces se piden a la API de ElevenLabs. Cada personaje necesita su `voz_id` y la clave va en un archivo `.env` (`ELEVENLABS_API_KEY=tu_clave`). Ojo: **el plan gratuito no permite usar por API las voces de la librería**, solo las predeterminadas. Chatterbox es el motor por defecto y el recomendado.

### 4. Escribir el guion y generar las voces

**Cada guion vive en su propio archivo de `guiones/`** (por ejemplo `guiones/ratio-del-cafe.json`): quién habla, qué dice, qué hace la cámara y qué gestos hacen los personajes.
Requiere Python 3, FFmpeg y el entorno y los samples del paso anterior.

```bash
python scripts/construir.py ratio-del-cafe   # voces -> unir audios -> tiempos (solo regenera lo que cambió)
python scripts/construir.py ratio-del-cafe --force   # regenera todas las voces
```

`construir.py` ejecuta en orden `generar_voces.py`, `unir_audios.py` y `medir_tiempos.py`, que también puedes lanzar por separado desde cualquier carpeta. Las voces ya generadas no se vuelven a generar mientras no cambies su texto, su sample o sus parámetros (se anotan en `audio/<guion>/manifest.json`). Una voz clonada en CPU tarda de unos 20 segundos a un minuto por línea.

#### Formato de un guion (`guiones/<nombre>.json`)

```json
{
  "motor": "chatterbox",
  "personajes": {
    "Samario":   { "referencia": "audio/referencia/samario.wav",   "exaggeration": 0.5, "cfg_weight": 0.5 },
    "Tostadito": { "referencia": "audio/referencia/tostadito.wav", "exaggeration": 0.7, "cfg_weight": 0.4 }
  },
  "planos": { "PICADO": { "pos": [0, 3, 2], "mira": [0, 1.3, 0] } },
  "lineas": [
    {
      "personaje": "Samario",
      "texto": "Lo que dice esta línea.",
      "camara": [
        { "en": 0.0, "plano": "SAMARIO" },
        { "en": 0.5, "plano": "CUP", "transicion": "rapida" },
        { "en": 0.8, "plano": "SAMARIO" }
      ],
      "acciones": [ { "en": 0.5, "dura": 0.8, "quien": "Tostadito", "gesto": "saltar" } ]
    }
  ]
}
```

- **`camara`**: un plano (`"camara": "CUP"`) o una lista de cambios. `en` es **cuánto de la línea ha pasado** (0 = inicio, 0.5 = mitad, 1 = final), así que sigue siendo válido aunque cambie la duración del audio. Si una línea no tiene `camara`, la cámara se queda como estaba.
- **Planos**: `WIDE`, `SAMARIO`, `CUP`, más los que definas en `planos` (`pos` = dónde está la cámara, `mira` = a dónde apunta).
- **`transicion`**: `corte` (instantánea), `rapida`, `normal` (por defecto) o `lenta`.
- **Movimientos creativos de cámara** (opciones de cada cambio de `camara`; todas opcionales):

  | Opción | Qué hace |
  |---|---|
  | `zoom` | Acercamiento por campo de visión: `1` normal, `1.5` más cerca, `0.8` más abierto (0.25 a 4) |
  | `dura` | Segundos que tarda el movimiento, con arranque y llegada suaves. Sin `dura` se usa `transicion` |
  | `orbita` | Grados que la cámara gira alrededor del punto de mira (positivo o negativo) |
  | `inclinacion` | Grados de ladeo del encuadre (plano holandés) |
  | `plano` | Si lo omites, la cámara conserva el plano actual y solo aplica zoom, órbita o inclinación |

  Cada orden define el estado completo: lo que no indiques vuelve a su valor normal (`zoom` 1, `orbita` 0, `inclinacion` 0). Ejemplos:

  ```json
  { "en": 0.1, "zoom": 1.5, "dura": 4 }                       // acercamiento lento de 4 s
  { "en": 0.0, "plano": "CUP", "zoom": 1.3, "dura": 3 }       // vuelo hasta la taza con zoom
  { "plano": "WIDE", "orbita": 20, "dura": 6 }                // giro alrededor de la escena
  { "en": 0.5, "inclinacion": 8, "transicion": "rapida" }     // encuadre ladeado
  ```
- **`acciones`**: gestos puntuales. `en` igual que arriba; `dura` en **segundos** (1 por defecto); `quien` por defecto es quien habla; `fuerza` opcional (1 = normal).
- **Gestos de Samario**: `asentir`, `negar`, `mirar_taza`, `mirar_frente`, `gesticular`. **De Tostadito**: `saltar`, `ladear`, `temblar`, `mirar_samario`, `mirar_frente`.
- **`pausa`** y **`solapar`** (opcionales, en cada línea): ritmo del diálogo en **segundos**. `pausa` = silencio antes de esa línea; `solapar` = cuánto entra encima de la anterior (interrumpir o hablar a la vez; los subtítulos y el movimiento siguen al que empezó último). No regeneran voces, solo reconstruyen el audio.
- Los scripts validan el archivo y avisan con el número de línea si algo está mal escrito.

#### Qué valores puedes tocar a mano

| Dónde | Campo | Unidad | Efecto al cambiarlo |
|---|---|---|---|
| `personajes.<N>` | `exaggeration`, `cfg_weight`, `semilla`, `referencia` | número / ruta | Regenera las voces de ese personaje |
| línea | `texto` | texto | Regenera solo esa voz |
| línea | `pausa`, `solapar` | **segundos** | Solo reconstruye audio y tiempos |
| `camara` | `en` | **fracción** de la línea (0 a 1) | Solo tiempos |
| `camara` | `plano`, `transicion`, `zoom`, `orbita`, `inclinacion` | ver tabla de arriba | Solo tiempos |
| `camara` / `acciones` | `dura` | **segundos** | Solo tiempos |
| `acciones` | `en` (fracción), `quien`, `gesto`, `fuerza` | | Solo tiempos |
| `planos` | `pos`, `mira` | coordenadas 3D | Solo tiempos |

Nunca edites `audio/<guion>/timeline.json` ni `manifest.json`: se generan solos. Tras cualquier cambio, `python scripts/construir.py <guion>`.

## Estructura del proyecto

```
.
├── index.html            Página, render, postprocesado y grabación
├── guiones/              LOS GUIONES (uno por archivo): texto, voces, cámara y gestos
├── escenas/              Escenografías (una por archivo .js; cafeteria.js)
├── .claude/skills/coffeetales/  Guía del proyecto para Claude Code (SKILL.md)
├── src/
│   ├── camera.js         Planos de cámara
│   ├── audio-sync.js     Sincronización audio-animación
│   ├── subtitles.js      Subtítulos dentro del canvas
│   └── scene-base.js     Versión original de la escena (respaldo)
├── models/
│   ├── samario.js        Barista (personaje activo)
│   ├── tostadito.js      Taza parlante
│   ├── samario-base.js   Versión original de Samario (respaldo)
│   └── tostadito-base.js Versión original de Tostadito (respaldo)
├── scripts/              Scripts de Python para voces, audio y tiempos
├── audio/                Una carpeta por guion con sus MP3, audio_completo.mp3 y timeline.json (generados)
│   └── referencia/       Tus samples de voz (samario.wav, tostadito.wav)
├── .venv/                Entorno de Chatterbox (no se versiona)
├── .env                  Clave de ElevenLabs, solo si la usas (no se versiona)
└── docs/                 Documentación adicional
```

## Qué hace cada archivo

### Raíz

| Archivo | Descripción |
|---|---|
| `index.html` | Monta el lienzo 1080 × 1920, el renderizador, el postprocesado y el botón que graba el video. Ejecuta el bucle de animación. |
| `CoffeeTales_Animacion3D.webm` | Video crudo grabado desde el navegador. |
| `CoffeeTales_Final.mp4` | Video final convertido con FFmpeg. |
| `esquema de luces Video.jpg` | Ilustración del esquema de luces generada con IA. Sirve como idea visual, **no es exacta**: varios valores no coinciden con el código (por ejemplo intensidades de `rimLightCyan` y `ambientLight`). Para valores fiables usa `docs/esquema de luces video.jpg` y `docs/ILUMINACION.md`. |

### `src/`

| Archivo | Descripción |
|---|---|
| `escenas/cafeteria.js` | (carpeta `escenas/`, fuera de `src/`) Crea la escena completa: luces, pared de ladrillo, pizarra, ventanas, lámparas, estantes, barra trasera y barra principal con textura y letrero. |
| `camera.js` | Define los planos `WIDE`, `SAMARIO` y `CUP` (más los del guion), la transición entre ellos y la vibración de cámara en mano. |
| `audio-sync.js` | Carga `timeline.json`, lee el volumen con Web Audio y anima a ambos personajes según quién hable y los gestos del guion. |
| `subtitles.js` | Toma el texto de `timeline.json` y dibuja los subtítulos en una capa 2D sobre el render, partidos en fragmentos de hasta 6 palabras. |
| `scene-base.js` | Copia de la escena original antes del rediseño del local. |

### `models/`

| Archivo | Descripción |
|---|---|
| `samario.js` | Exporta `createSamario()`: busto con pelo voxel, gafas, boca y ojos animados, miradas y brazo apoyado con mano. |
| `tostadito.js` | Exporta `createTostadito()`: taza facetada con café, vapor, luz cálida y cara expresiva. |
| `samario-base.js`, `tostadito-base.js` | Copias de las versiones originales de cada personaje. |

### `scripts/`

| Archivo | Descripción |
|---|---|
| `construir.py` | Ejecuta los tres pasos siguientes en orden. |
| `servidor.py` | Servidor local: sirve la página y la lista de guiones y escenas para los selectores. |
| `guion.py` | Lee y valida un guion de `guiones/` (módulo compartido). |
| `generar_voces.py` | Genera una pista de voz por línea (Chatterbox o ElevenLabs); solo las nuevas o modificadas. |
| `motor_chatterbox.py` | Lo ejecuta `generar_voces.py` dentro de `.venv`: clona la voz del sample y escribe los MP3. |
| `probar_chatterbox.py` | Pantalla web local para grabar samples, probar frases y afinar con los deslizadores. |
| `requirements-chatterbox.txt` | Dependencias del entorno de Chatterbox. |
| `unir_audios.py` | Concatena las pistas con FFmpeg en `audio_completo.mp3`. |
| `medir_tiempos.py` | Mide la duración de cada pista con FFprobe y escribe `audio/<guion>/timeline.json`. |

### `audio/` y `docs/`

| Archivo | Descripción |
|---|---|
| `audio/NN_personaje.mp3` | Los diálogos individuales (uno por línea del guion) y `audio_completo.mp3`, que reproduce la página. |
| `audio/referencia/` | Tus samples de voz. Son grabaciones de tu voz: decide si los subes al repositorio o los ignoras con `.gitignore`. |
| `audio/manifest.json` | Registro de qué línea se generó con qué texto y ajustes, para no regenerar lo que no cambió. |
| `docs/ILUMINACION.md` | Esquema de luces con nombres, valores, ubicación en el código y mapa en planta. **Ojo:** el código manda; hoy difieren el alcance de las lámparas colgantes (código `1.5`, documento `3.5`) y el color de `kickerLeft` (código `0x1485e0`, documento `0x1D4ED8`). |
| `docs/esquema de luces video.jpg` | Diagrama técnico (vista en planta, vista lateral y leyenda de las 6 luces) dibujado con los valores de `ILUMINACION.md`; hereda esas dos diferencias. Las alturas de los personajes y de `warmLight` son aproximadas. |

## Notas

- Los personajes se animan solo mientras suena el audio; antes de grabar quedan en reposo.
- **Postprocesado** (queda dentro del video grabado, no se puede quitar después): bloom (`UnrealBloomPass`: fuerza 0.35, radio 0.45, umbral 0.75), grano de película (`FilmPass`: 0.18, 0.025, 648) y tone mapping ACES Filmic con exposición 1.05; están en `index.html`. Los subtítulos se dibujan después de los filtros, por eso salen nítidos.
- **Boca y ruido de fondo:** la boca se abre cuando el nivel del analizador supera un umbral (`80` sobre 255, en `getAudioVolume()` de `src/audio-sync.js`). Las voces de Chatterbox tienen un leve ruido de fondo en las pausas (nivel ~25, hasta ~70) y al hablar el nivel es de 100 a 190. Si ves bocas que se mueven en las pausas, sube el umbral; si se quedan quietas con voz suave, bájalo.
- Si quieres conservar versiones antiguas de las voces, guárdalas fuera de `audio/` (o en una carpeta ignorada): los scripts solo usan los MP3 numerados, `audio_completo.mp3`, `manifest.json` y `referencia/`.
- `ffmpeg.exe`, la carpeta `0ComandosShell/`, `.venv/` y `.env` no se versionan (están en `.gitignore`); hay que tener FFmpeg instalado.
