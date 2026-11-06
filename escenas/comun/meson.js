// ---------------------------------------------------------------------------
// Utilidades de texturas pixel-art y el mesón (barra principal), comunes a todas las escenas
// ---------------------------------------------------------------------------
export function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function makeTexture(w, h, draw, repeat = null, pixel = true) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (pixel) tex.magFilter = THREE.NearestFilter;   // píxeles nítidos al acercarse
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

// Frente de la barra: paneles de madera oscura con marco
function drawCounterFront(ctx, w, h) {
  const rnd = seeded(21);
  ctx.fillStyle = '#2A150C';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#4A2A18';
  ctx.fillRect(0, 0, w, 9);
  ctx.fillStyle = '#150A05';
  ctx.fillRect(0, h - 9, w, 9);
  const n = 6;
  const pw = w / n;
  for (let i = 0; i < n; i++) {
    const x = i * pw;
    ctx.fillStyle = '#44261A';
    ctx.fillRect(x + 4, 13, pw - 8, h - 26);
    ctx.fillStyle = '#2F180E';
    ctx.fillRect(x + 8, 17, pw - 16, h - 34);
    ctx.fillStyle = '#5C3822';
    ctx.fillRect(x + 8, 17, pw - 16, 1);
    ctx.fillRect(x + 8, 17, 1, h - 34);
    ctx.fillStyle = '#170B06';
    ctx.fillRect(x + 8, h - 18, pw - 16, 1);
    ctx.fillRect(x + pw - 9, 17, 1, h - 34);
    ctx.fillStyle = '#1A0C06';
    ctx.fillRect(x, 0, 3, h);
  }
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,180,120,0.06)';
    ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
}

// Tablero de la barra: tablones, vetas, rayones y marcas de tazas
function drawCounterTop(ctx, w, h) {
  const rnd = seeded(33);
  const tones = ['#3A2216', '#33200F', '#41281A', '#2F1C10'];
  const plankH = 12;
  for (let y = 0; y < h; y += plankH) {
    ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
    ctx.fillRect(0, y, w, plankH);
    ctx.fillStyle = '#1A0E08';
    ctx.fillRect(0, y, w, 1);
    // juntas verticales entre tablones
    const jx = rnd() * w;
    ctx.fillRect(jx, y, 1, plankH);
  }
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(0,0,0,0.20)' : 'rgba(255,200,150,0.07)';
    ctx.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 24, 1);
  }
  // Marcas redondas de tazas
  ctx.strokeStyle = 'rgba(15, 6, 2, 0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(20 + rnd() * (w - 40), 10 + rnd() * (h - 20), 6, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Letrero del local pintado sobre la barra
function drawBrand(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const script = '"Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive';
  const cream = '#B8956A';   // tono madera clara, apagado: se lee sin llamar la atención

  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = cream;
  ctx.font = `bold 150px ${script}`;
  ctx.fillText('Don Samario', w / 2, h * 0.36);
  ctx.font = `bold 105px ${script}`;
  ctx.fillText('Fe y Café', w / 2, h * 0.76);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Florituras a los lados de la segunda línea
  ctx.fillStyle = 'rgba(184,149,106,0.7)';
  ctx.fillRect(40, h * 0.76 - 2, 140, 4);
  ctx.fillRect(w - 180, h * 0.76 - 2, 140, 4);
}
// El mesón con su letrero y los objetos entre los personajes. Es igual en todas las escenas.
export function crearMeson(scene) {
  const mats = {};
  function mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (!mats[key]) {
      mats[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true, ...opts });
    }
    return mats[key];
  }
  function cyl(rt, rb, h, seg, m) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); }
  function put(parent, mesh, x, y, z) { mesh.position.set(x, y, z); parent.add(mesh); return mesh; }

  const counterFrontTex = makeTexture(420, 95, drawCounterFront);
  const counterSide = mat(0x2E180E, { roughness: 0.75 });
  const counterFront = new THREE.MeshStandardMaterial({ map: counterFrontTex, roughness: 0.75 });
  // Orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.95, 1.1),
    [counterSide, counterSide, counterSide, counterSide, counterFront, counterSide]
  );
  counter.position.set(0, 0.475, 0.45);
  counter.receiveShadow = true;
  counter.castShadow = true;
  scene.add(counter);

  const counterTopTex = makeTexture(344, 96, drawCounterTop);
  const counterTopSide = mat(0x1E110A, { roughness: 0.45 });
  const counterTopFace = new THREE.MeshStandardMaterial({ map: counterTopTex, roughness: 0.45 });
  const counterTop = new THREE.Mesh(
    new THREE.BoxGeometry(4.3, 0.08, 1.2),
    [counterTopSide, counterTopSide, counterTopFace, counterTopSide, counterTopSide, counterTopSide]
  );
  counterTop.position.set(0, 0.99, 0.45);
  counterTop.receiveShadow = true;
  scene.add(counterTop);

  // Letrero pintado sobre el frente de la barra, bajo la zona de subtítulos
  const brand = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.39),
    new THREE.MeshBasicMaterial({
      map: makeTexture(1024, 420, drawBrand, null, false),
      transparent: true,
      opacity: 0.6
    })
  );
  brand.position.set(0, 0.42, 1.004);
  scene.add(brand);

  // Objetos pequeños sobre la barra, entre los personajes (frasco de azúcar y platito)
  const sugar = new THREE.Group();
  sugar.position.set(0.09, 1.03, 0.62);
  put(sugar, cyl(0.04, 0.04, 0.09, 8, mat(0xDDE8F5, { transparent: true, opacity: 0.5, roughness: 0.15 })), 0, 0.045, 0);
  put(sugar, cyl(0.034, 0.034, 0.06, 8, mat(0xF3EEE6)), 0, 0.032, 0);
  put(sugar, cyl(0.043, 0.043, 0.015, 8, mat(0x9A9A9A, { metalness: 0.6 })), 0, 0.097, 0);
  scene.add(sugar);
}
