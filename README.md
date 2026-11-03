# CoffeeTales · Motor 3D cinemático

Generador de cortos animados verticales (1080 × 1920, formato Reels/TikTok/Shorts) hecho enteramente con código. Dos personajes conversan en una cafetería sobre cómo preparar un buen café: **Samario**, el barista, y **Tostadito**, una taza parlante. Las voces se generan con síntesis de voz, la animación se sincroniza con el audio en tiempo real y el resultado se graba directamente desde el navegador.

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
| **ES Modules** | Organización del código | `index.html` importa `scene.js`, `camera.js`, `audio-sync.js`, `subtitles.js` y los modelos con `import` |
| **Web Audio API** | Lectura del volumen | `AnalyserNode` (FFT 256) sobre las frecuencias de la voz; ese valor mueve las bocas |
| **Canvas 2D + `CanvasTexture`** | Texturas y subtítulos procedurales | Ladrillo, madera, pizarra, etiquetas, café y letrero se dibujan por código; los subtítulos se dibujan en una capa ortográfica sobre el render |
| **`captureStream` + `MediaRecorder`** | Grabación del video | Captura el canvas a 30 fps junto con el audio, en VP9/Opus a 12 Mbps, y descarga un `.webm` |
| **edge-tts** (Python) | Voces | Voces neuronales de Microsoft `es-CO-GonzaloNeural` (Samario) y `es-CO-SalomeNeural` (Tostadito, con tono más agudo) |
| **FFmpeg / FFprobe** | Audio y video | Une los diálogos, mide duraciones y convierte el `.webm` final a `.mp4` |

### Cómo funciona la sincronización

1. `audio-sync.js` mide la duración de cada archivo de diálogo en el navegador y arma la línea de tiempo (hablante y plano de cámara por tramo). Si aún no cargaron los metadatos, usa tiempos de respaldo.
2. En cada fotograma, con `audio.currentTime` se busca el tramo activo, se lee el volumen y se llama a los métodos de cada personaje (`setJawOpen`, `setHeadAngles`, `setMouthScale`, `setOrientation`…).
3. Cada modelo suma por su cuenta animaciones autónomas: parpadeo, cambios de mirada, cejas, respiración, movimiento del brazo y vapor.
4. La cámara recibe el plano activo y se desplaza suavemente hacia él, con una pequeña vibración de cámara en mano.
5. Los subtítulos usan la misma línea de tiempo y se parten en fragmentos cortos.

## Cómo usarlo

### 1. Ver y grabar el video

Los módulos ES no funcionan abriendo el archivo con doble clic; hay que servir la carpeta por HTTP:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`, pulsa **Iniciar / Grabar Video 3D** y espera a que termine el audio. El navegador descarga un `.webm`. Hace falta conexión a internet para cargar Three.js desde el CDN.

### 2. Convertir a MP4

```bash
ffmpeg -i CoffeeTales_Animacion3D.webm -c:v libx264 -crf 18 -c:a aac CoffeeTales_Final.mp4
```

### 3. Regenerar las voces (opcional)

Requiere Python 3 y FFmpeg instalado:

```bash
pip install edge-tts
```

Los scripts usan rutas relativas:

| Paso | Script | Dónde ejecutarlo |
|---|---|---|
| Generar las 7 pistas de voz | `scripts/generar_voces.py` | Dentro de `audio/` |
| Unirlas en `audio_completo.mp3` | `scripts/unir_audios.py` | Dentro de `audio/` |
| Medir duraciones y escribir `src/timeline.json` | `scripts/medir_tiempos.py` | En la raíz del proyecto |

Si cambias el guion, actualiza también los textos de `src/subtitles.js` y la lista `dialogueTracks` de `src/audio-sync.js`.

## Estructura del proyecto

```
.
├── index.html            Página, render, postprocesado y grabación
├── src/
│   ├── scene.js          Escenografía y luces
│   ├── camera.js         Planos de cámara
│   ├── audio-sync.js     Sincronización audio-animación
│   ├── subtitles.js      Subtítulos dentro del canvas
│   ├── timeline.json     Tiempos de los diálogos (informativo)
│   └── scene-base.js     Versión original de la escena (respaldo)
├── models/
│   ├── samario.js        Barista (personaje activo)
│   ├── tostadito.js      Taza parlante
│   ├── samario-base.js   Versión original de Samario (respaldo)
│   └── tostadito-base.js Versión original de Tostadito (respaldo)
├── scripts/              Scripts de Python para audio y tiempos
├── audio/                Diálogos en MP3 y audio completo
└── docs/                 Documentación adicional
```

## Qué hace cada archivo

### Raíz

| Archivo | Descripción |
|---|---|
| `index.html` | Monta el lienzo 1080 × 1920, el renderizador, el postprocesado y el botón que graba el video. Ejecuta el bucle de animación. |
| `CoffeeTales_Animacion3D.webm` | Video crudo grabado desde el navegador. |
| `CoffeeTales_Final.mp4` | Video final convertido con FFmpeg. |
| `esquema de luces Video.jpg` | Imagen de referencia del esquema de luces. |

### `src/`

| Archivo | Descripción |
|---|---|
| `scene.js` | Crea la escena completa: luces, pared de ladrillo, pizarra, ventanas, lámparas, estantes, barra trasera y barra principal con textura y letrero. |
| `camera.js` | Define los planos `WIDE`, `SAMARIO` y `CUP`, la transición suave entre ellos y la vibración de cámara en mano. |
| `audio-sync.js` | Calcula la línea de tiempo desde los audios, lee el volumen con Web Audio y anima a ambos personajes según quién hable. |
| `subtitles.js` | Dibuja los subtítulos en una capa 2D sobre el render, partidos en fragmentos de hasta 6 palabras. |
| `timeline.json` | Tiempos medidos de cada diálogo, generado por `medir_tiempos.py`. Hoy el navegador mide los suyos, así que es informativo. |
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
| `generar_voces.py` | Genera las 7 pistas de voz con edge-tts a partir del guion. |
| `unir_audios.py` | Concatena las pistas con FFmpeg en `audio_completo.mp3`. |
| `medir_tiempos.py` | Mide la duración de cada pista con FFprobe y escribe `src/timeline.json`. |

### `audio/` y `docs/`

| Archivo | Descripción |
|---|---|
| `audio/*.mp3` | Los 7 diálogos individuales y el audio completo que reproduce la página. |
| `docs/ILUMINACION.md` | Esquema de luces con nombres, valores, ubicación en el código y mapa en planta. |

## Notas

- Los personajes se animan solo mientras suena el audio; antes de grabar quedan en reposo.
- `ffmpeg.exe` y la carpeta `0ComandosShell/` no se versionan (están en `.gitignore`); hay que tener FFmpeg instalado.
