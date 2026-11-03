import { getTimeline } from './audio-sync.js';

const TEXT_COLOR = '#FFFFFF';   // siempre blanco, hable quien hable

// Zona segura de Instagram: franja entre ~62% y ~82% de la altura del cuadro
const CENTER_Y_FRACTION = 0.72;   // centro del subtítulo, medido desde arriba
const MAX_WORDS = 6;

// Parte una frase en fragmentos cortos, cortando preferentemente tras la puntuación
function splitIntoChunks(text) {
  const words = text.split(/\s+/);
  const chunks = [];
  let current = [];
  words.forEach(word => {
    current.push(word);
    const endsPhrase = /[.,;:!?…»]$/.test(word) || /^\.\.\./.test(word) || /\.\.\.$/.test(word);
    if (current.length >= MAX_WORDS || (endsPhrase && current.length >= 3)) {
      chunks.push(current.join(' '));
      current = [];
    }
  });
  if (current.length) {
    // Evita un fragmento final de una sola palabra
    if (current.length === 1 && chunks.length) chunks[chunks.length - 1] += ' ' + current[0];
    else chunks.push(current.join(' '));
  }
  return chunks;
}

// Los textos vienen de guion.json (vía timeline.json); se parten una sola vez por línea
const chunkCache = new Map();
function getChunks(index, text) {
  if (!chunkCache.has(index)) chunkCache.set(index, splitIntoChunks(text));
  return chunkCache.get(index);
}

// Capa de subtítulos dibujada DENTRO del canvas WebGL: se graba junto al video
export function createSubtitles(width, height) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -1, 1);

  const CANVAS_W = 1000;
  const CANVAS_H = 260;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false   // evita que el tono cinematográfico apague el blanco
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CANVAS_W, CANVAS_H), material);
  mesh.position.y = height / 2 - height * CENTER_Y_FRACTION;
  mesh.visible = false;
  scene.add(mesh);

  let shownKey = '';

  function wrap(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    words.forEach(w => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function draw(text, color) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const fontSize = 64;
    ctx.font = `800 ${fontSize}px system-ui, "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = wrap(text, CANVAS_W - 120);
    const lineH = fontSize * 1.25;
    const blockH = lines.length * lineH;
    const startY = (CANVAS_H - blockH) / 2;

    // Sin marco ni fondo: solo texto blanco con una sombra suave para que se lea
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    lines.forEach((l, i) => {
      ctx.fillText(l, CANVAS_W / 2, startY + lineH * (i + 0.5));
    });
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    texture.needsUpdate = true;
  }

  // time < 0 oculta los subtítulos (antes de reproducir o al terminar)
  function update(time) {
    if (time < 0) {
      mesh.visible = false;
      return;
    }
    const timeline = getTimeline();
    const index = timeline.findIndex(s => time >= s.start && time < s.end);
    if (index < 0 || !timeline[index].texto) {
      mesh.visible = false;
      return;
    }

    const seg = timeline[index];
    const chunks = getChunks(index, seg.texto);
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const frac = Math.min(Math.max((time - seg.start) / (seg.end - seg.start), 0), 0.9999);

    // Cada fragmento dura según su cantidad de caracteres
    let acc = 0;
    let chunkIndex = chunks.length - 1;
    for (let i = 0; i < chunks.length; i++) {
      acc += chunks[i].length / total;
      if (frac < acc) { chunkIndex = i; break; }
    }

    const key = index + ':' + chunkIndex;
    if (key !== shownKey) {
      shownKey = key;
      draw(chunks[chunkIndex], TEXT_COLOR);
    }
    mesh.visible = true;
  }

  return { scene, camera, update };
}
