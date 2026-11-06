# Esquema de iluminación

Guía de las luces de la escena 3D de **CoffeeTales** (Three.js r128): qué luz es cada una, dónde está, qué valores tiene y en qué archivo y línea se edita.

> Los números de línea son aproximados y pueden moverse si se edita el archivo. Busca siempre por el **nombre de la variable**.

## Resumen rápido

| Nombre en el código | Archivo | Tipo | Color | Qué hace en el video |
|---|---|---|---|---|
| `ambientLight` | `escenas/cafeteria.js` | Ambiente | `0x0F1826` | Base oscura azulada de toda la escena |
| `keyLight` | `escenas/cafeteria.js` | Foco (SpotLight) | `0xFFA866` ámbar | Luz principal cálida, de frente a la izquierda |
| `rimLightCyan` | `escenas/cafeteria.js` | Foco (SpotLight) | `0x00E5FF` cian | Borde cian en el contorno derecho |
| `kickerLeft` | `escenas/cafeteria.js` | Puntual (PointLight) | `0x1D4ED8` azul | Borde azul tenue en el hombro izquierdo |
| `light` en `createPendant` (×2) | `escenas/cafeteria.js` | Puntual (PointLight) | `0xFFB066` cálido | Ladrillo y pizarra por arriba, a los lados |
| `warmLight` | `models/tostadito.js` | Puntual (PointLight) | `0xFF8A3D` naranja | Resplandor del café dentro de la taza |

## Detalle de cada luz

### 1. `ambientLight` — luz ambiente
- **Archivo:** `escenas/cafeteria.js` (≈ línea 232)
- **Código:** `new THREE.AmbientLight(0x0F1826, 0.75)`
- **Valores:** color `0x0F1826`, intensidad `0.75`.
- **Efecto:** ilumina por igual todas las caras, venga la luz de donde venga. Al ser muy oscura, las caras que no reciben ninguna otra luz quedan casi negras.
- **Si quieres más claridad en las zonas de sombra:** sube la intensidad o usa un color más claro (por ejemplo `0x2A3A55`).

### 2. `keyLight` — luz principal (cálida, ámbar)
- **Archivo:** `escenas/cafeteria.js` (≈ líneas 237–252)
- **Posición:** `(-1.4, 2.6, 2.2)` — a la izquierda, arriba y delante de los personajes.
- **Objetivo:** `targetObj` en `(0, 1.25, 0.2)`.
- **Valores:**

  | Propiedad | Valor |
  |---|---|
  | Color | `0xFFA866` |
  | Intensidad | `2.2` |
  | `angle` | `Math.PI / 2.8` |
  | `penumbra` | `0.85` (borde muy suave) |
  | `decay` | `1.8` |
  | `distance` | `8.5` |
  | `castShadow` | `true` |
  | `shadow.bias` | `-0.001` |
  | `shadow.mapSize` | `1024 × 1024` |

- **Efecto:** da el tono cálido a las caras y a la mitad izquierda de la taza. Las caras que miran hacia la derecha le quedan de espaldas y reciben muy poca luz.
- **Es la única luz que proyecta sombras.**

### 3. `rimLightCyan` — luz de contorno (cian)
- **Archivo:** `escenas/cafeteria.js` (≈ líneas 256–262)
- **Posición:** `(2.2, 2.6, -1.4)` — a la derecha, arriba y **detrás** de los personajes.
- **Objetivo:** `targetObj` en `(0, 1.25, 0.2)`.
- **Valores:** color `0x00E5FF`, intensidad `2.2`, `angle = Math.PI / 2.5`, `penumbra = 0.5`.
- **Efecto:** dibuja la línea cian en el borde derecho de Samario, del pelo y de la taza. Al venir de atrás, no ilumina las caras frontales.

### 4. `kickerLeft` — luz de recorte azul (SpotLight)
- **Archivo:** `escenas/cafeteria.js` (≈ líneas 263–272)
- **Posición:** `(-2.2, 2.0, -1.0)` — a la izquierda y detrás.
- **Objetivo:** `kickerTarget` en `(0, 1.3, -0.25)` — la espalda de los personajes.
- **Valores:** color `0x1485E0`, intensidad `7.0`, `distance = 5.0`, `angle = Math.PI / 4`, `penumbra = 0.6`.
- **Efecto:** recorta con un borde azul el hombro y la cabeza desde atrás.

### 5. Lámparas colgantes — `light` dentro de `createPendant(x)`
- **Archivo:** `escenas/cafeteria.js` (≈ líneas 318–330). Se crean dos: `createPendant(-0.85)` y `createPendant(0.85)`.
- **Posición:** `(±0.85, 3.03, -1.3)` — en lo alto, delante de la pared.
- **Valores:** color `0xFFB066`, intensidad `0.9`, `distance = 3.5`, `decay = 2`.
- **Efecto:** ilumina el ladrillo, la pizarra y las ventanas por la parte superior. La bombilla visible es un material sin luz propia (`MeshBasicMaterial 0xFFE0A0`).

### 6. `warmLight` — luz del café
- **Archivo:** `models/tostadito.js` (≈ líneas 94–95)
- **Posición (relativa a la taza):** `(0, 0.355 + 0.08, 0)` — justo encima del café.
- **Valores:** color `0xFF8A3D`, intensidad `0.55`, `distance = 0.9`, `decay = 2`. La intensidad parpadea `±0.06` en el bucle de animación (`warmLight.intensity = 0.55 + Math.sin(t * 2.3) * 0.06`).
- **Efecto:** da la sensación de café caliente y tiñe de naranja el interior de la taza.

## Materiales que se iluminan solos (emisivos)

Estos materiales brillan sin depender de ninguna luz:

| Objeto | Archivo | Valor |
|---|---|---|
| Pared de ladrillo (`wallMat`) | `escenas/cafeteria.js` | `emissiveIntensity: 0.32` |
| Cara de la pizarra (`boardFace`) | `escenas/cafeteria.js` | `emissiveIntensity: 0.12` |
| Superficie del café (`coffeeMat`) | `models/tostadito.js` | `emissiveIntensity: 0.35` |
| Bombilla de las lámparas | `escenas/cafeteria.js` | `MeshBasicMaterial 0xFFE0A0` (sin sombreado) |

## Sombras

- **Solo `keyLight` proyecta sombras.** Mapa de `1024 × 1024` con `PCFSoftShadowMap` (configurado en `index.html`).
- **Reciben sombra:** la barra (`counter`, `counterTop`).
- **Proyectan sombra:** la barra y la taza (`cupBody`) entre otros.
- La taza **no recibe sombra** (`cupBody.receiveShadow = false`). Se desactivó para evitar rayas (acné de sombra) en sus caras planas.

## Ajustes del renderizador (`index.html`)

Afectan a cómo se ve el resultado de todas las luces:

| Ajuste | Valor |
|---|---|
| `renderer.toneMapping` | `ACESFilmicToneMapping` |
| `renderer.toneMappingExposure` | `1.05` |
| Bloom (`UnrealBloomPass`) | fuerza `0.35`, radio `0.45`, umbral `0.75` |
| Grano de película (`FilmPass`) | ruido `0.18`, líneas `0.025`, cantidad `648` |

## Mapa en planta (vista desde arriba)

`x` va de izquierda a derecha, `z` va del fondo (pared) hacia la cámara. Las alturas (`y`) están indicadas entre paréntesis.

```
 z = -2.2  ┌──────────────── PARED DE LADRILLO / PIZARRA / VENTANAS ────────────────┐

 z = -1.4   kickerLeft         pendiente(-0.85)     pendiente(0.85)      rimLightCyan
            (-2.2, y2.0)       (y3.03)              (y3.03)              (2.2, y2.6)
 z = -1.0

 z = -0.15                  SAMARIO (-0.52)
 z =  0.35                                        TOSTADITO (0.42)
                                                   └ warmLight (dentro de la taza)
            ══════════════════════ BARRA (frente en z = 1.0) ══════════════════════

 z =  2.2   keyLight
            (-1.4, y2.6)

 z =  4.4                           CÁMARA (plano WIDE) (0, y1.55)
```

## Guía rápida de ajustes

| Quiero… | Edito… |
|---|---|
| Que los lados oscuros se vean menos negros | Subir `ambientLight` (intensidad o color) |
| Que la cara de Samario o de la taza tenga más luz | Subir la intensidad de `keyLight` |
| Cambiar el tono general (más frío o más cálido) | El color de `keyLight` (`0xFFA866`) |
| Quitar o suavizar el borde cian | Bajar la intensidad de `rimLightCyan` |
| Quitar el borde azul del hombro | Bajar la intensidad de `kickerLeft` |
| Que el fondo de ladrillo se vea más o menos | `emissiveIntensity` de `wallMat` o la intensidad de las lámparas |
| Que el café se vea más caliente o más frío | `warmLight` y `emissiveIntensity` de `coffeeMat` |
| Menos brillo en luces fuertes | El umbral del `UnrealBloomPass` en `index.html` |
