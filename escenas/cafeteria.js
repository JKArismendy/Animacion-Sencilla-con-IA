import { seeded, makeTexture, crearMeson } from './comun/meson.js';

// Pared de ladrillo: ladrillos grandes con relieve y moteado
function drawBricks(ctx, w, h) {
  const rnd = seeded(7);
  ctx.fillStyle = '#3A2420';
  ctx.fillRect(0, 0, w, h);
  const palette = ['#8C4630', '#7D3D2B', '#964F37', '#6E3425', '#A25C42', '#84402D'];
  const bw = 32, bh = 16;
  for (let row = 0; row < h / bh; row++) {
    const off = (row % 2) * (bw / 2);
    for (let col = -1; col < w / bw + 1; col++) {
      const x = col * bw + off;
      const y = row * bh;
      ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      ctx.fillStyle = 'rgba(255, 200, 170, 0.14)';
      ctx.fillRect(x + 1, y + 1, bw - 2, 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
      ctx.fillRect(x + 1, y + bh - 3, bw - 2, 2);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(0,0,0,0.14)' : 'rgba(255,190,150,0.10)';
        ctx.fillRect(x + 2 + rnd() * (bw - 6), y + 3 + rnd() * (bh - 7), 2, 2);
      }
    }
  }
}

// Pizarra de menú con tiza
function drawMenuBoard(ctx, w, h) {
  ctx.fillStyle = '#12151D';
  ctx.fillRect(0, 0, w, h);
  const rnd = seeded(5);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`;
    ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
  const chalk = '#DDE5EE';
  const accent = '#E76F51';
  const script = '"Segoe Print", "Comic Sans MS", cursive';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = accent;
  ctx.font = `bold 46px ${script}`;
  ctx.textAlign = 'left';
  ctx.fillText('MENÚ', 28, 38);
  ctx.fillRect(28, 62, 150, 4);

  const items = [['Espresso', '3.0'], ['Americano', '3.5'], ['Latte', '4.5'], ['V60 · Chemex', '5.0']];
  ctx.font = `28px ${script}`;
  items.forEach(([name, price], i) => {
    const y = 88 + i * 22;
    ctx.fillStyle = chalk;
    ctx.textAlign = 'left';
    ctx.fillText(name, 28, y);
    ctx.fillStyle = accent;
    ctx.textAlign = 'right';
    ctx.fillText(price, w - 28, y);
    // Línea punteada entre el nombre y el precio
    ctx.fillStyle = 'rgba(221,229,238,0.35)';
    const dotsFrom = 28 + ctx.measureText(name).width + 14;
    const dotsTo = w - 28 - ctx.measureText(price).width - 14;
    for (let dx = dotsFrom; dx < dotsTo; dx += 6) ctx.fillRect(dx, y + 8, 2, 2);
  });
}

// Ventana nocturna con luces de ciudad
function drawWindow(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0B1B33');
  grad.addColorStop(1, '#14414F');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  const rnd = seeded(11);
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = rnd() > 0.5 ? '#FFD27A' : '#9CE7F5';
    ctx.fillRect(Math.floor(rnd() * w), Math.floor(h * 0.55 + rnd() * h * 0.45), 2, 2);
  }
}

// Etiqueta de las bolsas de café
function makeLabelTexture(title, sub, bg) {
  return makeTexture(96, 104, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2A1A10';
    ctx.fillRect(8, 8, w - 16, 3);
    ctx.fillRect(8, h - 11, w - 16, 3);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px system-ui, Arial, sans-serif';
    ctx.fillText(title, w / 2, 40);
    ctx.font = '12px system-ui, Arial, sans-serif';
    ctx.fillText(sub, w / 2, 62);
    ctx.fillStyle = '#5A3520';
    ctx.beginPath();
    ctx.ellipse(w / 2, 84, 9, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
  });
}


export function setupScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080D); // Fondo oscuro profundo

  // Atajos para crear piezas con sombreado plano (mismo estilo que los personajes)
  const mats = {};
  function mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (!mats[key]) {
      mats[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true, ...opts });
    }
    return mats[key];
  }
  function box(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
  function cyl(rt, rb, h, seg, m) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); }
  function put(parent, mesh, x, y, z) { mesh.position.set(x, y, z); parent.add(mesh); return mesh; }

  // 1. ILUMINACIÓN EQUILIBRADA Y CONTRASTADA

  // Luz ambiente base baja para mantener sombras profundas sin empastar
  const ambientLight = new THREE.AmbientLight(0x0F1826, 0.05);
  scene.add(ambientLight);

  // KEY LIGHT CÁLIDA / ÁMBAR (En ángulo de 45° a la izquierda, altura media 2.6m)
  // Crea sombra natural bajo la visera, pero bañando los ojos y el rostro sin quemar
  const keyLight = new THREE.SpotLight(0xf5ad78, 2.5);
  keyLight.position.set(0.5, 2.6, 2.2);
  keyLight.angle = Math.PI / 2.8;
  keyLight.penumbra = 0.85; // Borde suave
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

  // LA LUZ TRASERA AZUL CIAN (RIM / KICKER) RECUPERADA
  // Entra desde atrás a la derecha con fuerza para recortar siluetas
  const rimLightCyan = new THREE.SpotLight(0x1c9eb8, 2.2);
  rimLightCyan.position.set(2.2, 2.6, -1.4);
  rimLightCyan.angle = Math.PI / 2.5;
  rimLightCyan.penumbra = 0.5;
  rimLightCyan.target = targetObj;
  scene.add(rimLightCyan);

  // Luz de recorte azul por el lado izquierdo: mismo sitio, apuntando a la espalda
  // de los personajes para dibujar el contorno de hombros y cabeza
  const kickerLeft = new THREE.SpotLight(0x1485e0, 5.0, 5.0);
  kickerLeft.position.set(-2.2, 2.0, -1.0);
  kickerLeft.angle = Math.PI / 4;
  kickerLeft.penumbra = 0.6;
  const kickerTarget = new THREE.Object3D();
  kickerTarget.position.set(0.0, 1.3, -0.25);   // espalda de los personajes
  scene.add(kickerTarget);
  kickerLeft.target = kickerTarget;
  scene.add(kickerLeft);

  // 2. PARED DE LADRILLO (estilo pixel-art de cafetería)
  const brickTex = makeTexture(128, 128, drawBricks, [10 / 1.12, 8 / 1.12]);
  const wallMat = new THREE.MeshStandardMaterial({
    map: brickTex,
    roughness: 0.95,
    emissive: 0xFFFFFF,
    emissiveMap: brickTex,
    emissiveIntensity: 0.32   // los ladrillos se leen aun con poca luz
  });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), wallMat);
  backWall.position.set(0, 3, -2.2);
  scene.add(backWall);

  // 3. PIZARRA DE MENÚ (con texto a tiza)
  const boardFrameMat = mat(0x2A1A10, { roughness: 0.8 });
  // La pizarra queda entre las ventanas (sus bordes interiores están en x = ±0.93)
  const boardFrame = box(1.85, 0.78, 0.05, boardFrameMat);
  put(scene, boardFrame, 0, 2.97, -2.18);
  const boardFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.77, 0.684),
    new THREE.MeshStandardMaterial({
      map: makeTexture(440, 170, drawMenuBoard, null, false),
      roughness: 0.7,
      emissive: 0xFFFFFF,
      emissiveIntensity: 0.12,
      emissiveMap: makeTexture(440, 170, drawMenuBoard, null, false)
    })
  );
  boardFace.position.set(0, 2.97, -2.15);
  scene.add(boardFace);

  // 4. VENTANAS NOCTURNAS A LOS LADOS
  function createWindow(x) {
    const g = new THREE.Group();
    g.position.set(x, 2.6, -2.17);
    put(g, box(0.5, 1.5, 0.06, mat(0x2A1A10)), 0, 0, 0);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 1.4),
      new THREE.MeshBasicMaterial({ map: makeTexture(32, 96, drawWindow), toneMapped: true })
    );
    put(g, glass, 0, 0, 0.035);
    put(g, box(0.02, 1.4, 0.03, mat(0x1A0F08)), 0, 0, 0.04);
    put(g, box(0.4, 0.02, 0.03, mat(0x1A0F08)), 0, 0.2, 0.04);
    put(g, box(0.4, 0.02, 0.03, mat(0x1A0F08)), 0, -0.3, 0.04);
    scene.add(g);
  }
  createWindow(-1.18);
  createWindow(1.18);

  // 5. LÁMPARAS COLGANTES
  function createPendant(x) {
    const g = new THREE.Group();
    g.position.set(x, 3.15, -1.4);
    put(g, cyl(0.007, 0.007, 1.2, 6, mat(0x111111)), 0, 0.7, 0);
    put(g, cyl(0.04, 0.17, 0.18, 8, mat(0x15161C, { metalness: 0.4, roughness: 0.4 })), 0, 0, 0);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xFFE0A0 })), 0, -0.07, 0);
    const light = new THREE.PointLight(0xe6af30, 1.5, 1.5, 0.12);
    light.position.set(0, -0.12, 0.1);
    g.add(light);
    scene.add(g);
  }
  createPendant(-0.85);
  createPendant(0.85);

  // 6. ESTANTES CON CAFÉ, BOLSAS Y MÉTODOS DE PREPARACIÓN
  const woodShelf = mat(0x5A341C, { roughness: 0.8 });
  const woodDark = mat(0x3A2012, { roughness: 0.8 });
  const glass = mat(0xCFE3EA, { transparent: true, opacity: 0.35, roughness: 0.1 });
  const coffeeDark = mat(0x2A1408);
  const steel = mat(0xB8BCC4, { metalness: 0.85, roughness: 0.3 });
  const black = mat(0x15161C, { roughness: 0.5 });
  const white = mat(0xF2F2F5, { roughness: 0.35 });
  const SHELF_Z = -2.04;
  const SHELF_A_Y = 1.55;    // métodos de preparación
  const SHELF_B_Y = 2.10;    // bolsas, tazas y frascos

  function createShelf(y) {
    put(scene, box(1.9, 0.045, 0.32, woodShelf), 0, y, SHELF_Z);
    [-0.82, 0.82].forEach(bx => put(scene, box(0.04, 0.12, 0.26, woodDark), bx, y - 0.08, SHELF_Z));
  }
  createShelf(SHELF_A_Y);
  createShelf(SHELF_B_Y);
  const baseA = SHELF_A_Y + 0.0225;
  const baseB = SHELF_B_Y + 0.0225;

  // --- Estante A: métodos de preparación ---
  function frenchPress(x) {
    const g = new THREE.Group();
    g.position.set(x, baseA, SHELF_Z);
    put(g, cyl(0.06, 0.06, 0.02, 8, black), 0, 0.01, 0);
    put(g, cyl(0.055, 0.055, 0.2, 8, glass), 0, 0.12, 0);
    put(g, cyl(0.05, 0.05, 0.11, 8, coffeeDark), 0, 0.065, 0);
    put(g, cyl(0.06, 0.06, 0.02, 8, black), 0, 0.23, 0);
    put(g, cyl(0.006, 0.006, 0.08, 6, steel), 0, 0.28, 0);
    put(g, cyl(0.016, 0.016, 0.02, 6, black), 0, 0.32, 0);
    put(g, box(0.02, 0.16, 0.025, black), 0.082, 0.12, 0);
    scene.add(g);
  }
  function chemex(x) {
    const g = new THREE.Group();
    g.position.set(x, baseA, SHELF_Z);
    put(g, cyl(0.04, 0.085, 0.13, 8, glass), 0, 0.065, 0);
    put(g, cyl(0.033, 0.075, 0.07, 8, coffeeDark), 0, 0.035, 0);
    put(g, cyl(0.095, 0.04, 0.13, 8, glass), 0, 0.195, 0);
    put(g, cyl(0.048, 0.048, 0.04, 8, mat(0x8A5A32)), 0, 0.13, 0);
    scene.add(g);
  }
  function v60(x) {
    const g = new THREE.Group();
    g.position.set(x, baseA, SHELF_Z);
    put(g, cyl(0.055, 0.065, 0.13, 8, glass), 0, 0.065, 0);
    put(g, cyl(0.05, 0.06, 0.07, 8, coffeeDark), 0, 0.035, 0);
    put(g, cyl(0.085, 0.02, 0.09, 8, mat(0xE9E4DC, { roughness: 0.4 })), 0, 0.175, 0);
    put(g, box(0.05, 0.02, 0.02, mat(0xE9E4DC)), 0.095, 0.2, 0);
    scene.add(g);
  }
  function kettle(x) {
    const g = new THREE.Group();
    g.position.set(x, baseA, SHELF_Z);
    put(g, cyl(0.07, 0.08, 0.11, 10, steel), 0, 0.055, 0);
    put(g, cyl(0.045, 0.07, 0.03, 10, steel), 0, 0.125, 0);
    put(g, cyl(0.012, 0.012, 0.03, 6, black), 0, 0.155, 0);
    const spout = put(g, cyl(0.011, 0.016, 0.16, 6, steel), -0.1, 0.12, 0);
    spout.rotation.z = 0.9;
    put(g, box(0.02, 0.1, 0.025, black), 0.095, 0.09, 0);
    put(g, box(0.07, 0.02, 0.025, black), 0.075, 0.145, 0);
    scene.add(g);
  }
  function moka(x) {
    const g = new THREE.Group();
    g.position.set(x, baseA, SHELF_Z);
    put(g, cyl(0.05, 0.065, 0.075, 8, mat(0xC9CED6, { metalness: 0.7, roughness: 0.35 })), 0, 0.0375, 0);
    put(g, cyl(0.04, 0.05, 0.015, 8, mat(0x8F959E, { metalness: 0.7 })), 0, 0.0825, 0);
    put(g, cyl(0.065, 0.045, 0.11, 8, mat(0xC9CED6, { metalness: 0.7, roughness: 0.35 })), 0, 0.145, 0);
    put(g, cyl(0.03, 0.03, 0.02, 8, black), 0, 0.21, 0);
    put(g, box(0.05, 0.02, 0.02, black), 0.085, 0.16, 0);
    scene.add(g);
  }
  function aeropress(x) {
    const g = new THREE.Group();
    g.position.set(x, baseA, SHELF_Z);
    put(g, cyl(0.038, 0.038, 0.2, 10, mat(0xDDE8F5, { transparent: true, opacity: 0.45, roughness: 0.2 })), 0, 0.1, 0);
    put(g, cyl(0.03, 0.03, 0.09, 10, black), 0, 0.245, 0);
    put(g, cyl(0.042, 0.042, 0.02, 10, black), 0, 0.01, 0);
    scene.add(g);
  }
  frenchPress(-0.78);
  chemex(-0.5);
  v60(-0.18);
  kettle(0.17);
  moka(0.48);
  aeropress(0.78);

  // --- Estante B: bolsas de café, tazas, frascos y planta ---
  function coffeeBag(x, bodyColor, foldColor, labelBg, title, sub) {
    const g = new THREE.Group();
    g.position.set(x, baseB, SHELF_Z);
    put(g, box(0.2, 0.3, 0.085, mat(bodyColor, { roughness: 0.85 })), 0, 0.15, 0);
    put(g, box(0.2, 0.04, 0.095, mat(foldColor, { roughness: 0.85 })), 0, 0.295, 0);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.13, 0.14),
      new THREE.MeshBasicMaterial({ map: makeLabelTexture(title, sub, labelBg) })
    );
    put(g, label, 0, 0.14, 0.0435);
    scene.add(g);
  }
  coffeeBag(-0.80, 0xB88A5A, 0x9A6E45, '#EFE3C9', 'ETIOPÍA', '250 g');
  coffeeBag(-0.58, 0x24262D, 0x181A20, '#EFE3C9', 'HUILA', '250 g');
  coffeeBag(-0.36, 0xC95A3A, 0xA84628, '#F5EBD5', 'NARIÑO', '500 g');
  coffeeBag(-0.14, 0xE4D5B8, 0xC9B896, '#3A2616', 'SELECCIÓN', '250 g');
  coffeeBag(0.08, 0x2E6B6B, 0x214F4F, '#EFE3C9', 'CAUCA', '500 g');

  function shelfCup(x) {
    const g = new THREE.Group();
    g.position.set(x, baseB, SHELF_Z);
    put(g, cyl(0.07, 0.07, 0.01, 10, white), 0, 0.005, 0);
    put(g, cyl(0.05, 0.036, 0.065, 8, white), 0, 0.0425, 0);
    put(g, box(0.02, 0.035, 0.012, white), 0.058, 0.045, 0);
    scene.add(g);
  }
  shelfCup(0.28);
  shelfCup(0.42);

  function beanJar(x, h) {
    const g = new THREE.Group();
    g.position.set(x, baseB, SHELF_Z);
    put(g, cyl(0.075, 0.075, h, 10, glass), 0, h / 2, 0);
    put(g, cyl(0.067, 0.067, h * 0.68, 8, mat(0x3B1E10)), 0, h * 0.34 + 0.005, 0);
    put(g, cyl(0.08, 0.08, 0.025, 10, mat(0x9A9A9A, { metalness: 0.6 })), 0, h + 0.012, 0);
    scene.add(g);
  }
  beanJar(0.6, 0.19);
  beanJar(0.77, 0.15);

  // Planta pequeña (como en la referencia)
  const plant = new THREE.Group();
  plant.position.set(0.88, baseB, SHELF_Z);
  put(plant, cyl(0.05, 0.04, 0.07, 8, mat(0xB5573A)), 0, 0.035, 0);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.13, 4), mat(i % 2 ? 0x3C8C4B : 0x2F7A3F));
    leaf.position.set(Math.cos(i * 1.05) * 0.025, 0.13, Math.sin(i * 1.05) * 0.025);
    leaf.rotation.z = Math.cos(i * 1.05) * 0.5;
    leaf.rotation.x = Math.sin(i * 1.05) * 0.5;
    plant.add(leaf);
  }
  scene.add(plant);

  // 7. BARRA TRASERA CON MÁQUINA DE ESPRESSO Y MOLINO
  const BAR_TOP = 0.99;
  put(scene, box(3.0, 0.95, 0.5, mat(0x2A150C, { roughness: 0.8 })), 0, 0.475, -1.92);
  put(scene, box(3.05, 0.04, 0.55, mat(0x1A0D07, { roughness: 0.5 })), 0, 0.97, -1.92);

  const metalMat = mat(0x98A2B3, { metalness: 0.85, roughness: 0.25 });
  const darkMetalMat = mat(0x16181F, { roughness: 0.5 });
  const espressoMachine = new THREE.Group();
  espressoMachine.position.set(0.88, BAR_TOP, -1.92);
  espressoMachine.scale.setScalar(0.85);
  put(espressoMachine, box(0.75, 0.55, 0.65, metalMat), 0, 0.275, 0);
  put(espressoMachine, box(0.72, 0.04, 0.60, darkMetalMat), 0, 0.57, 0);
  for (let i = -0.16; i <= 0.16; i += 0.32) {
    put(espressoMachine, cyl(0.06, 0.06, 0.10, 8, metalMat), i, 0.25, 0.35);
    const handle = put(espressoMachine, cyl(0.02, 0.02, 0.22, 8, darkMetalMat), i, 0.20, 0.46);
    handle.rotation.x = Math.PI / 2.3;
  }
  const steamWand = put(espressoMachine, cyl(0.015, 0.015, 0.32, 8, metalMat), -0.32, 0.22, 0.35);
  steamWand.rotation.z = 0.3;
  // Tazas encima de la máquina para calentarse
  for (let i = 0; i < 3; i++) {
    put(espressoMachine, cyl(0.05, 0.035, 0.06, 8, white), -0.2 + i * 0.2, 0.62, 0);
  }
  scene.add(espressoMachine);

  // Molino de café con tolva transparente
  const grinder = new THREE.Group();
  grinder.position.set(0.38, BAR_TOP, -1.88);
  put(grinder, box(0.13, 0.22, 0.15, black), 0, 0.11, 0);
  put(grinder, cyl(0.07, 0.035, 0.17, 8, mat(0xD9A35F, { transparent: true, opacity: 0.45 })), 0, 0.305, 0);
  put(grinder, cyl(0.06, 0.03, 0.11, 8, mat(0x3B1E10)), 0, 0.28, 0);
  put(grinder, cyl(0.04, 0.04, 0.02, 8, black), 0, 0.4, 0);
  scene.add(grinder);

  // Jarra de leche en acero
  const pitcher = new THREE.Group();
  pitcher.position.set(0.14, BAR_TOP, -1.85);
  put(pitcher, cyl(0.05, 0.04, 0.1, 10, steel), 0, 0.05, 0);
  put(pitcher, box(0.02, 0.07, 0.02, black), 0.065, 0.06, 0);
  scene.add(pitcher);

  // Pila de tazas
  for (let i = 0; i < 3; i++) {
    put(scene, cyl(0.05, 0.036, 0.06, 8, white), -0.22, BAR_TOP + 0.03 + i * 0.045, -1.85);
  }

  // 8. MESÓN (igual en todas las escenas)
  crearMeson(scene);

  return scene;
}
