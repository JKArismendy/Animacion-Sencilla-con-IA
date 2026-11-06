import { seeded, makeTexture, crearMeson } from './comun/meson.js';

// ---------------------------------------------------------------------------
// Escena "atardecer": playa al ocaso en pixel-art, con vida propia.
// Solo cambian el fondo y las luces; el mesón es el mismo de todas las escenas.
//
// El fondo ya no es una sola imagen: son capas (planos con textura pixel-art) a distintas
// profundidades, y las que tienen vida se animan en cada fotograma desde scene.userData.update(t):
//   - cielo, sol, montañas y mar            -> capa fija
//   - nubes (2 capas)                       -> se desplazan a distinta velocidad
//   - olas (2 capas)                        -> se deslizan en sentidos opuestos
//   - reflejo del sol                       -> centellea (3 patrones que se alternan)
//   - velero                                -> flota, se mece y se desplaza despacio
//   - gaviotas                              -> cruzan el cielo batiendo las alas
//   - palmeras                              -> tronco que se mece y hojas que ondean con el viento
//
// El lienzo base mide 320 x 240 píxeles (cada píxel = 0.0225 unidades en la escena):
//   x = 160 es el centro (entre los personajes), y = 162 es el horizonte (≈ 1.75 m de altura).
//   Con el plano WIDE se ven los píxeles x 100..220 y de y 73 hacia abajo hasta el mesón.
// ---------------------------------------------------------------------------
const W = 320, H = 240;
const HORIZONTE = 162;
const SOL = { x: 160, y: HORIZONTE, r: 44 };
const S = 0.0225;                         // unidades de escena por píxel
const wx = (px) => (px - W / 2) * S;      // píxel del lienzo -> x en la escena
const wy = (py) => 2.7 + (H / 2 - py) * S; // píxel del lienzo -> y en la escena
const Z_FONDO = -2.2;

const OSCURO = '#0b2838', MEDIO = '#10394f';

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
function mezcla(a, b, t) {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
// Color de un degradado de paradas [[posición 0..1, '#rrggbb'], ...]
function degradado(paradas, t) {
  t = Math.min(Math.max(t, 0), 1);
  for (let i = 1; i < paradas.length; i++) {
    if (t <= paradas[i][0]) {
      const [t0, c0] = paradas[i - 1], [t1, c1] = paradas[i];
      return mezcla(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return paradas[paradas.length - 1][1];
}
// Pinceles de píxel sobre un contexto 2D
function pinceles(ctx) {
  return {
    P: (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); },
    R: (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
  };
}

const MAR = [[0, '#f08a50'], [0.1, '#cf645c'], [0.28, '#3f8f9d'], [0.6, '#27809a'], [1, '#184f6c']];

// ============================ CAPAS (dibujo) ============================

// Capa fija: cielo, resplandor, sol, montañas, mar liso y arena
function drawFondo(ctx) {
  const rnd = seeded(11);
  const { P, R } = pinceles(ctx);
  const PASOS = 9;   // el degradado se parte en franjas, como en el pixel-art clásico

  const cielo = [[0, '#a82a4e'], [0.3, '#d2444f'], [0.55, '#ee6b4b'], [0.78, '#f9a04d'], [1, '#fde08a']];
  for (let y = 0; y < HORIZONTE; y++) {
    const t = (y - 40) / (HORIZONTE - 40);
    for (let x = 0; x < W; x++) {
      const q = Math.round(t * PASOS + (rnd() - 0.5) * 0.9) / PASOS;
      P(x, y, degradado(cielo, q));
    }
  }
  // Resplandor del sol (puntos que se espacian al alejarse)
  for (let y = 0; y < HORIZONTE; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - SOL.x, (y - SOL.y) * 1.05);
      if (d > SOL.r && d < SOL.r + 30 && rnd() < 0.55 * (1 - (d - SOL.r) / 30)) P(x, y, '#fcc45a');
    }
  }
  // Sol: medio disco con franjas más oscuras hacia el horizonte
  for (let y = SOL.y - SOL.r; y <= SOL.y; y++) {
    const dy = y - SOL.y;
    const medio = Math.floor(Math.sqrt(SOL.r * SOL.r - dy * dy));
    let c = mezcla('#fde682', '#f9b44f', (y - (SOL.y - SOL.r)) / SOL.r);
    if (y > SOL.y - 22 && y % 5 === 0) c = '#f08a4a';
    R(SOL.x - medio, y, medio * 2 + 1, 1, c);
  }
  // Montañas lejanas a los lados, siluetas azul verdoso
  function montana(pico, alto, pendiente) {
    let ruido = 0;
    for (let x = 0; x < W; x++) {
      ruido = Math.min(Math.max(ruido + (rnd() - 0.5) * 2.2, -4), 4);
      const h = Math.max(0, alto - Math.abs(x - pico) * pendiente) + (alto - Math.abs(x - pico) * pendiente > 0 ? ruido : 0);
      if (h <= 0) continue;
      const top = HORIZONTE - Math.round(h);
      R(x, top, 1, HORIZONTE - top, '#2c6878');
      R(x, HORIZONTE - Math.round(h * 0.4), 1, Math.round(h * 0.4), '#235a6c');
      if (rnd() < 0.6) P(x, top, '#5b7d83');   // borde tocado por la luz del sol
    }
  }
  montana(30, 72, 0.7);
  montana(292, 66, 0.55);
  // Mar liso: degradado de naranja a azul profundo
  for (let y = HORIZONTE; y < H; y++) {
    const t = (y - HORIZONTE) / (H - HORIZONTE);
    for (let x = 0; x < W; x++) {
      const q = Math.round(t * PASOS + (rnd() - 0.5) * 0.8) / PASOS;
      P(x, y, degradado(MAR, q));
    }
  }
  // Arena al fondo del lienzo (queda tapada por el mesón)
  for (let y = 214; y < H; y++) {
    for (let x = 0; x < W; x++) P(x, y, mezcla('#d68a4e', '#a85a3a', (y - 214) / (H - 214) + (rnd() - 0.5) * 0.2));
  }
}

// Nubes: montículos con la base en sombra. Se dibujan lejos de los bordes para que, al
// desplazar la textura en bucle, el corte no parta ninguna.
function dibujarNubes(semilla, lista) {
  return (ctx) => {
    const rnd = seeded(semilla);
    const { R } = pinceles(ctx);
    function nube(cx, cy, ancho) {
      for (let m = 0; m < 3; m++) {
        const mx = cx + (m - 1) * ancho * 0.28 + Math.round((rnd() - 0.5) * 3);
        const mw = ancho * (0.5 - Math.abs(m - 1) * 0.12);
        const alto = 3 + Math.round(rnd() * 2) + (m === 1 ? 1 : 0);
        for (let k = 0; k < alto; k++) {
          const w = mw * (1 - k * 0.2);
          const c = k === 0 ? '#cf5a62' : k === alto - 1 ? '#fbc0a2' : k === 1 ? '#ee7f78' : '#f7a08a';
          R(mx - w / 2, cy - k, w, 1, c);
        }
      }
      R(cx - ancho / 2, cy, ancho, 1, '#cf5a62');
    }
    lista.forEach(([x, y, w]) => nube(x, y, w));
  };
}

// Olas: rayitas horizontales más claras o más oscuras (la textura se repite en horizontal)
function dibujarOlas(semilla, cantidad) {
  return (ctx) => {
    const rnd = seeded(semilla);
    const { R } = pinceles(ctx);
    for (let i = 0; i < cantidad; i++) {
      const y = HORIZONTE + 2 + Math.floor(rnd() * (H - HORIZONTE - 28));
      const x = 8 + Math.floor(rnd() * (W - 28));
      const base = degradado(MAR, (y - HORIZONTE) / (H - HORIZONTE));
      R(x, y, 3 + Math.floor(rnd() * 8), 1, rnd() < 0.55 ? mezcla(base, '#ffffff', 0.13) : mezcla(base, '#0a2a40', 0.22));
    }
  };
}

// Reflejo del sol: se ensancha hacia abajo. Tres patrones distintos que se van alternando.
function dibujarReflejo(semilla) {
  return (ctx) => {
    const rnd = seeded(semilla);
    const { R } = pinceles(ctx);
    for (let y = HORIZONTE + 1; y < 214; y++) {
      const dist = y - HORIZONTE;
      const medio = 5 + dist * 0.55;
      for (let x = SOL.x - medio; x <= SOL.x + medio; x++) {
        const centro = 1 - Math.abs(x - SOL.x) / medio;
        if (rnd() < 0.13 + 0.3 * centro) {
          R(x, y, 2 + Math.floor(rnd() * 5), 1, rnd() < 0.6 ? '#fde08a' : '#f9b04e');
        }
      }
    }
  };
}

// Rocas a los pies de las palmeras (borde iluminado por el sol)
function drawRocas(ctx) {
  const rnd = seeded(31);
  const { P, R } = pinceles(ctx);
  function rocas(montes) {
    for (const [cx, ancho, alto] of montes) {
      for (let x = cx - ancho; x <= cx + ancho; x++) {
        const k = 1 - Math.pow((x - cx) / ancho, 2);
        if (k <= 0) continue;
        const h = Math.round(alto * Math.sqrt(k)) + Math.round((rnd() - 0.5) * 2);
        const top = 226 - h;
        R(x, top, 1, 226 - top, '#25162b');
        P(x, top + 2, '#4a2438');
        P(x, top, rnd() < 0.8 ? '#d0584a' : '#8a3a44');
        P(x, top + 1, '#6a2d3e');
      }
    }
  }
  rocas([[78, 22, 30], [108, 14, 20], [50, 14, 17]]);
  rocas([[248, 22, 26], [222, 12, 16], [276, 14, 15]]);
}

// Velero: silueta oscura con dos velas (lienzo propio de 28 x 32, casco abajo)
const VELERO_W = 28, VELERO_H = 32;
function drawVelero(ctx) {
  const { R } = pinceles(ctx);
  const C = '#0c2538';
  const bx = 14, by = 28;
  R(bx - 9, by, 19, 2, C);
  R(bx - 7, by + 2, 15, 1, C);
  R(bx, by - 24, 1, 24, C);
  for (let r = 0; r < 22; r++) R(bx + 1, by - 2 - r, Math.max(1, Math.round((22 - r) * 0.45)), 1, C);
  for (let r = 0; r < 14; r++) R(bx - Math.max(1, Math.round((14 - r) * 0.5)), by - 2 - r, Math.max(1, Math.round((14 - r) * 0.5)), 1, C);
}

// Gaviota con las alas arriba (0) o abajo (1)
const AVE_W = 12, AVE_H = 8;
function dibujarAve(estado) {
  return (ctx) => {
    const { P } = pinceles(ctx);
    const alas = estado === 0
      ? [[-5, -3], [-4, -2], [-3, -1], [-2, 0], [-1, 0], [0, 1], [1, 0], [2, 0], [3, -1], [4, -2], [5, -3]]
      : [[-5, 1], [-4, 1], [-3, 1], [-2, 1], [-1, 0], [0, 1], [1, 0], [2, 1], [3, 1], [4, 1], [5, 1]];
    alas.forEach(([dx, dy]) => P(6 + dx, 4 + dy, '#12303f'));
  };
}

// Tronco de palmera: curva de Bézier cuadrática, más gruesa abajo. Devuelve el lienzo y
// dónde queda en él la base (para colocar el sprite con el pivote en el suelo).
function crearTronco(base, ctrl, copa, semilla) {
  const rnd = seeded(semilla);
  const pts = [];
  for (let s = 0; s <= 1; s += 0.004) {
    const x = (1 - s) * (1 - s) * base[0] + 2 * s * (1 - s) * ctrl[0] + s * s * copa[0];
    const y = (1 - s) * (1 - s) * base[1] + 2 * s * (1 - s) * ctrl[1] + s * s * copa[1];
    pts.push([x, y, Math.max(3, Math.round(7 - s * 4))]);
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs)) - 6, y0 = Math.floor(Math.min(...ys)) - 3;
  const cw = Math.ceil(Math.max(...xs)) + 6 - x0, ch = Math.ceil(Math.max(...ys)) + 3 - y0;
  const tex = makeTexture(cw, ch, (ctx) => {
    const { P, R } = pinceles(ctx);
    for (const [x, y, g] of pts) {
      R(x - x0 - g / 2, y - y0, g, 1, OSCURO);
      const lado = SOL.x > x ? x - x0 + g / 2 : x - x0 - g / 2 - 1;   // borde que mira al sol
      if (rnd() < 0.7) P(lado, y - y0, '#c4504a');
    }
  });
  return { tex, cw, ch, x0, y0 };
}

// Hoja de palmera con flecos, dibujada con el penacho en el centro del lienzo
const HOJA = 120;
function dibujarHoja(grados, largo, caida) {
  return (ctx) => {
    const { P, R } = pinceles(ctx);
    const c = HOJA / 2;
    const a = grados * Math.PI / 180;
    const color = grados % 2 === 0 ? OSCURO : MEDIO;
    for (let s = 0; s <= 1; s += 1 / largo) {
      const x = c + Math.cos(a) * s * largo;
      const y = c - Math.sin(a) * s * largo + caida * s * s * largo;
      const g = Math.max(1, Math.round(3 * (1 - s)));
      R(x, y, g, g, color);
      if (Math.round(s * largo) % 2 === 0) {   // flecos que cuelgan a ambos lados
        const l = Math.round(7 * Math.sin(Math.PI * s)) + 1;
        for (let j = 1; j <= l; j++) {
          P(x - j * 0.5, y + j, color);
          P(x + j * 0.5, y + j, color);
        }
      }
    }
  };
}
function dibujarCentroPenacho(ctx) {
  const { P, R } = pinceles(ctx);
  const c = HOJA / 2;
  R(c - 3, c - 2, 6, 5, OSCURO);
  P(c - 1, c + 3, '#4a2a22');
  P(c + 2, c + 3, '#4a2a22');
}

// ============================ CONSTRUCCIÓN ============================

// Plano con textura transparente, sin luces (colores fieles al pixel-art)
function capa(tex, ancho, alto, x, y, z, orden) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho, alto),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
  );
  m.position.set(x, y, z);
  m.renderOrder = orden;
  return m;
}
// Capa del tamaño del lienzo base
function capaLienzo(tex, z, orden) {
  return capa(tex, W * S, H * S, 0, 2.7, z, orden);
}
function repetible(tex) {
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function crearPalmera(scene, { base, ctrl, copa, hojas, semilla, fase, signo }) {
  const tronco = crearTronco(base, ctrl, copa, semilla);
  const grupo = new THREE.Group();                    // pivote en el pie del tronco
  grupo.position.set(wx(base[0]), wy(base[1]), -2.15);

  const sprite = capa(tronco.tex, tronco.cw * S, tronco.ch * S,
    wx(tronco.x0 + tronco.cw / 2) - wx(base[0]),
    wy(tronco.y0 + tronco.ch / 2) - wy(base[1]), 0, 6);
  grupo.add(sprite);

  const penacho = new THREE.Group();                  // pivote en la copa
  penacho.position.set(wx(copa[0]) - wx(base[0]), wy(copa[1]) - wy(base[1]), 0.01);
  grupo.add(penacho);
  const hojasObj = hojas.map(([grados, largo, caida], i) => {
    const h = capa(makeTexture(HOJA, HOJA, dibujarHoja(grados, largo, caida)), HOJA * S, HOJA * S, 0, 0, 0, 7);
    h.position.z = 0.001 * i;
    penacho.add(h);
    return { h, fase: fase + i * 1.3, grados };
  });
  const centro = capa(makeTexture(HOJA, HOJA, dibujarCentroPenacho), HOJA * S, HOJA * S, 0, 0, 0.02, 8);
  penacho.add(centro);
  scene.add(grupo);

  // viento: el tronco se mece despacio y cada hoja ondea con su propio ritmo
  return (t, viento) => {
    grupo.rotation.z = signo * (0.012 + 0.03 * viento) + Math.sin(t * 0.7 + fase) * 0.01;
    penacho.rotation.z = Math.sin(t * 0.9 + fase) * 0.025;
    for (const o of hojasObj) {
      const arriba = o.grados > 20 && o.grados < 160 ? 1 : 0.6;   // las hojas altas se mueven menos
      o.h.rotation.z = (Math.sin(t * 1.8 + o.fase) * 0.07 + viento * 0.06 * signo) * arriba;
    }
  };
}

export function setupScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1A1020);

  // 1. ILUMINACIÓN: contraluz anaranjado del sol, relleno cálido al frente y recortes de color
  scene.add(new THREE.AmbientLight(0x2A1830, 0.25));

  // Luz principal cálida de frente, algo rosada como el cielo
  const keyLight = new THREE.SpotLight(0xf5a07a, 1.7);
  keyLight.position.set(0.5, 2.6, 2.2);
  keyLight.angle = Math.PI / 2.8;
  keyLight.penumbra = 0.85;
  keyLight.decay = 1.8;
  keyLight.distance = 8.5;
  keyLight.castShadow = true;
  keyLight.shadow.bias = -0.001;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  const targetObj = new THREE.Object3D();
  targetObj.position.set(0, 1.25, 0.2);
  scene.add(targetObj);
  keyLight.target = targetObj;
  scene.add(keyLight);

  // Contraluz del sol, justo detrás de los personajes: recorta las siluetas en naranja
  const solTras = new THREE.SpotLight(0xffa850, 0.35);
  solTras.position.set(0, 2.2, -1.8);
  solTras.angle = Math.PI / 3;
  solTras.penumbra = 0.6;
  solTras.target = targetObj;
  scene.add(solTras);

  // Recorte frío del mar por la derecha (contraste con el naranja)
  const rimMar = new THREE.SpotLight(0x1c9eb8, 2.0);
  rimMar.position.set(2.2, 2.6, -1.4);
  rimMar.angle = Math.PI / 2.5;
  rimMar.penumbra = 0.5;
  rimMar.target = targetObj;
  scene.add(rimMar);

  // Recorte rosado por la izquierda
  const kickerLeft = new THREE.SpotLight(0xe05a90, 4.0, 5.0);
  kickerLeft.position.set(-2.2, 2.0, -1.0);
  kickerLeft.angle = Math.PI / 4;
  kickerLeft.penumbra = 0.6;
  const kickerTarget = new THREE.Object3D();
  kickerTarget.position.set(0.0, 1.3, -0.25);
  scene.add(kickerTarget);
  kickerLeft.target = kickerTarget;
  scene.add(kickerLeft);

  // 2. FONDO EN CAPAS (de atrás hacia delante)
  const fondo = new THREE.Mesh(
    new THREE.PlaneGeometry(W * S, H * S),
    new THREE.MeshBasicMaterial({ map: makeTexture(W, H, drawFondo, null, true), toneMapped: false })
  );
  fondo.position.set(0, 2.7, Z_FONDO);
  scene.add(fondo);

  // Nubes lejanas (lentas) y cercanas (más rápidas), en bucle horizontal
  const nubesLejos = repetible(makeTexture(W, H, dibujarNubes(5, [[60, 92, 26], [150, 104, 30], [250, 96, 28]])));
  const nubesCerca = repetible(makeTexture(W, H, dibujarNubes(7, [[70, 100, 44], [140, 118, 34], [206, 106, 40], [262, 124, 50], [176, 134, 22]])));
  scene.add(capaLienzo(nubesLejos, Z_FONDO + 0.01, 1));
  scene.add(capaLienzo(nubesCerca, Z_FONDO + 0.02, 2));

  // Olas: dos capas que se deslizan en sentidos opuestos
  const olasA = repetible(makeTexture(W, H, dibujarOlas(41, 150)));
  const olasB = repetible(makeTexture(W, H, dibujarOlas(43, 110)));
  scene.add(capaLienzo(olasA, Z_FONDO + 0.03, 3));
  scene.add(capaLienzo(olasB, Z_FONDO + 0.035, 3));

  // Reflejo del sol: tres patrones que centellean
  const reflejos = [51, 53, 57].map((sem, i) => {
    const m = capaLienzo(makeTexture(W, H, dibujarReflejo(sem)), Z_FONDO + 0.04 + i * 0.001, 4);
    m.material.opacity = 0;
    scene.add(m);
    return m;
  });

  // Velero
  const velero = capa(makeTexture(VELERO_W, VELERO_H, drawVelero), VELERO_W * S, VELERO_H * S, wx(206), wy(184 - 12), Z_FONDO + 0.05, 5);
  scene.add(velero);
  const veleroX0 = velero.position.x, veleroY0 = velero.position.y;

  // Rocas
  scene.add(capaLienzo(makeTexture(W, H, drawRocas), Z_FONDO + 0.06, 5));

  // Gaviotas (dos fotogramas: alas arriba / abajo)
  const aveTex = [makeTexture(AVE_W, AVE_H, dibujarAve(0)), makeTexture(AVE_W, AVE_H, dibujarAve(1))];
  const aves = [
    { x: 0.2, y: 2.9, v: 0.16, fase: 0, esc: 1.0 },
    { x: 1.4, y: 3.15, v: 0.13, fase: 1.7, esc: 0.8 },
    { x: -1.1, y: 2.75, v: 0.19, fase: 3.1, esc: 1.2 },
  ].map((d) => {
    const m = capa(aveTex[0], AVE_W * S * 1.6 * d.esc, AVE_H * S * 1.6 * d.esc, d.x, d.y, Z_FONDO + 0.07, 6);
    scene.add(m);
    return { ...d, m, y0: d.y };
  });

  // Palmeras: tronco que se mece y hojas que ondean
  const palmeras = [
    crearPalmera(scene, {
      base: [84, 214], ctrl: [92, 150], copa: [112, 98], semilla: 61, fase: 0, signo: 1,
      hojas: [[172, 46, 0.7], [142, 42, 0.8], [108, 32, 0.9], [74, 30, 1.0], [36, 40, 0.9], [8, 46, 0.8], [-18, 36, 0.7], [200, 44, 0.5], [236, 34, 0.4]],
    }),
    crearPalmera(scene, {
      base: [240, 214], ctrl: [230, 150], copa: [210, 92], semilla: 67, fase: 2.4, signo: -1,
      hojas: [[8, 46, 0.7], [38, 42, 0.8], [72, 32, 0.9], [106, 30, 1.0], [144, 40, 0.9], [172, 46, 0.8], [198, 36, 0.7], [-12, 44, 0.5], [-52, 34, 0.4]],
    }),
  ];

  // 3. MESÓN (igual en todas las escenas)
  crearMeson(scene);

  // 4. ANIMACIÓN: index.html llama a scene.userData.update(t) en cada fotograma (t en segundos)
  const LIM = 3.4;   // las gaviotas dan la vuelta fuera de pantalla
  scene.userData.update = (t) => {
    // Viento: ráfagas suaves entre 0 y 1
    const viento = 0.5 + 0.5 * Math.sin(t * 0.45) * Math.sin(t * 0.23 + 1);
    palmeras.forEach((f) => f(t, viento));

    nubesLejos.offset.x = (t * 0.0006) % 1;
    nubesCerca.offset.x = (t * 0.0016) % 1;
    olasA.offset.x = (t * 0.004) % 1;
    olasB.offset.x = (-t * 0.0025) % 1;

    reflejos.forEach((m, i) => {
      const v = Math.sin(t * 1.7 + i * 2.1);
      m.material.opacity = Math.max(0, v) * 0.95;
    });

    velero.position.x = veleroX0 + Math.sin(t * 0.05) * 0.5 + Math.sin(t * 0.3) * 0.01;
    velero.position.y = veleroY0 + Math.sin(t * 1.1) * 0.012;
    velero.rotation.z = Math.sin(t * 0.8) * 0.03;

    for (const a of aves) {
      let x = ((a.x + t * a.v + LIM) % (2 * LIM)) - LIM;   // cruza de izquierda a derecha en bucle
      a.m.position.x = x;
      a.m.position.y = a.y0 + Math.sin(t * 0.8 + a.fase) * 0.12;
      a.m.material.map = aveTex[Math.sin(t * 7 + a.fase) > 0.1 ? 0 : 1];
    }
  };

  return scene;
}
