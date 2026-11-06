// Textura sutil para romper el plástico plano manteniendo el estilo facetado
function createStylizedTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 350; i++) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 35 + 10, 1.5);
  }

  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

const sharedTexture = createStylizedTexture();

// Generador pseudoaleatorio determinista: el peinado es idéntico en cada carga
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

import { bevelBox } from './bevel-box.js';

// Inclina la parte alta de una manga hacia afuera (`outerSign` = +1 si el lado
// exterior es +x, -1 si es -x): continúa la pendiente del hombro, sin esquina recta
function slopeTop(geo, outerSign, drop) {
  const p = geo.attributes.position;
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  for (let i = 0; i < p.count; i++) {
    minY = Math.min(minY, p.getY(i)); maxY = Math.max(maxY, p.getY(i));
    minX = Math.min(minX, p.getX(i)); maxX = Math.max(maxX, p.getX(i));
  }
  const band = (maxY - minY) * 0.3;                         // franja alta afectada
  for (let i = 0; i < p.count; i++) {
    const w = Math.max((p.getY(i) - (maxY - band)) / band, 0);   // 0 abajo de la franja, 1 arriba
    const outer = (p.getX(i) * outerSign - (minX + maxX) / 2 * outerSign) / ((maxX - minX) / 2);   // -1 interior .. 1 exterior
    p.setY(i, p.getY(i) - drop * w * (outer + 1) / 2);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// Redondea solo la esquina superior exterior de una manga (la punta del hombro):
// los vértices que quedan fuera de un cuarto de círculo de radio `r` se proyectan
// sobre él. Necesita vértices extra cerca de esa esquina (ver los splitsY de bevelBox).
function roundTopOuter(geo, outerSign, r) {
  const p = geo.attributes.position;
  let maxY = -Infinity, outerX = -Infinity;
  for (let i = 0; i < p.count; i++) {
    maxY = Math.max(maxY, p.getY(i));
    outerX = Math.max(outerX, p.getX(i) * outerSign);
  }
  for (let i = 0; i < p.count; i++) {
    const dx = outerX - p.getX(i) * outerSign;   // distancia hacia adentro desde el borde exterior
    const dy = maxY - p.getY(i);                 // distancia hacia abajo desde el borde superior
    if (dx >= r || dy >= r) continue;
    const dist = Math.hypot(r - dx, r - dy);
    if (dist <= r) continue;
    const k = r / dist;
    p.setX(i, (outerX - (r - (r - dx) * k)) * outerSign);
    p.setY(i, maxY - (r - (r - dy) * k));
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// Afina una pieza hacia abajo: el extremo inferior queda con `bottomScale` del
// ancho y del grosor (mangas y antebrazos más estrechos hacia el codo y la muñeca)
function taperDown(geo, bottomScale) {
  const p = geo.attributes.position;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < p.count; i++) { minY = Math.min(minY, p.getY(i)); maxY = Math.max(maxY, p.getY(i)); }
  for (let i = 0; i < p.count; i++) {
    const t = (maxY - p.getY(i)) / (maxY - minY);          // 0 arriba, 1 abajo
    const s = 1 - (1 - bottomScale) * t;
    p.setX(i, p.getX(i) * s);
    p.setZ(i, p.getZ(i) * s);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function createSamario() {
  const group = new THREE.Group();
  group.position.set(-0.52, 0, -0.15);

  // PALETA CROMÁTICA (estilo low-poly / voxel)
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xE0A47E,
    map: sharedTexture,
    roughness: 0.65,
    flatShading: true
  });
  const skinShadeMat = new THREE.MeshStandardMaterial({
    color: 0xC98A66,
    roughness: 0.7,
    flatShading: true
  });
  // Material blanco: el color real de cada cubito de pelo va por instancia
  const hairVoxelMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.85,
    flatShading: true
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: 0x6B6F78,
    roughness: 0.85,
    flatShading: true
  });
  const poloRedMat = new THREE.MeshStandardMaterial({
    color: 0xB02A37,
    map: sharedTexture,
    roughness: 0.7,
    flatShading: true
  });
  const poloCollarMat = new THREE.MeshStandardMaterial({
    color: 0x861C29,
    roughness: 0.75,
    flatShading: true
  });

  // Gafas gruesas marrones y opacas
  const glassesFrameMat = new THREE.MeshStandardMaterial({
    color: 0x5A3A28,
    roughness: 0.45,
    flatShading: true
  });
  const glassesLensMat = new THREE.MeshStandardMaterial({
    color: 0xDDE8F5,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.18
  });
  const micMat = new THREE.MeshBasicMaterial({ color: 0x111216 }); // Micrófono de solapa
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x15161C });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xF7F7F9, roughness: 0.3, flatShading: true });

  // 1. TORSO / HOMBROS (BUSTO)
  // Torso y hombros en UNA sola pieza: se dibuja la silueta frontal (cintura,
  // pecho, axila, hombro en pendiente y base del cuello) y se extruye con un
  // chaflán que redondea las aristas. Sin piezas sueltas, sin huecos entre ellas.
  // Las coordenadas son la mitad derecha (x >= 0); se refleja para la izquierda.
  // El chaflán agrega TORSO_BEVEL a cada lado, así que el contorno final es un poco mayor.
  const TORSO_BEVEL = 0.02;
  const TORSO_DEPTH = 0.28;
  const torsoHalf = [
    [0.25, 0.89],    // base (oculta tras la barra)
    [0.26, 1.05],    // cintura / costillas
    [0.29, 1.24],    // pecho, a la altura de la axila
    [0.33, 1.32],    // parte alta del pecho
    [0.345, 1.355],  // punta del hombro: queda metida bajo la manga, sin asomar
    [0.30, 1.405],   // pendiente del trapecio
    [0.14, 1.44],
    [0.07, 1.45]     // base del cuello
  ];
  const torsoShape = new THREE.Shape();
  torsoShape.moveTo(-torsoHalf[0][0], torsoHalf[0][1]);
  torsoHalf.forEach(([x, y]) => torsoShape.lineTo(x, y));
  for (let i = torsoHalf.length - 1; i >= 0; i--) torsoShape.lineTo(-torsoHalf[i][0], torsoHalf[i][1]);
  torsoShape.closePath();
  const torsoGeo = new THREE.ExtrudeGeometry(torsoShape, {
    depth: TORSO_DEPTH - 2 * TORSO_BEVEL,
    bevelEnabled: true,
    bevelThickness: TORSO_BEVEL,
    bevelSize: TORSO_BEVEL,
    bevelOffset: 0,
    bevelSegments: 6,
    steps: 1
  });
  torsoGeo.translate(0, 0, -(TORSO_DEPTH - 2 * TORSO_BEVEL) / 2);
  // La respiración (más abajo) mueve torso.position.y alrededor de 1.15, así que
  // la geometría se centra en ese origen en vez de usar alturas absolutas
  const TORSO_ORIGIN_Y = 1.15;
  torsoGeo.translate(0, -TORSO_ORIGIN_Y, 0);
  const torso = new THREE.Mesh(torsoGeo, poloRedMat);
  torso.position.y = TORSO_ORIGIN_Y;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const neck = new THREE.Mesh(bevelBox(0.15, 0.16, 0.14, 0.005), skinShadeMat);
  neck.position.y = 1.50;
  neck.castShadow = true;
  group.add(neck);

  // Cuello de polo: dos solapas anguladas y botón
  const collarL = new THREE.Mesh(bevelBox(0.15, 0.05, 0.20, 0.012), poloCollarMat);
  collarL.position.set(0.09, 1.45, 0.04);
  collarL.rotation.z = 0.4;   // extremo exterior hacia arriba
  const collarR = collarL.clone();
  collarR.position.x = -0.09;
  collarR.rotation.z = -0.4;  // extremo exterior hacia arriba
  group.add(collarL, collarR);

  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.01), poloCollarMat);
  placket.position.set(0, 1.35, 0.145);
  group.add(placket);

  const micClip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), micMat);
  micClip.position.set(0, 1.30, 0.15);
  group.add(micClip);

  // 2. BRAZOS
  // Vértices extra cerca de la parte alta de la manga para poder redondear la punta del hombro
  const SLEEVE_SPLITS = [0.083, 0.063];
  function createArm(xPos) {
    const armGroup = new THREE.Group();
    armGroup.position.set(xPos, 1.40, 0.02);

    const sleeve = new THREE.Mesh(
      slopeTop(roundTopOuter(taperDown(bevelBox(0.14, 0.22, 0.16, 0.012, SLEEVE_SPLITS), 0.82),
        xPos > 0 ? 1 : -1, 0.05), xPos > 0 ? 1 : -1, 0.035), poloRedMat);
    sleeve.position.y = -0.10;
    sleeve.castShadow = true;
    armGroup.add(sleeve);

    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.20, 0);
    forearmGroup.rotation.x = 0.45;

    const forearm = new THREE.Mesh(taperDown(bevelBox(0.10, 0.26, 0.11, 0.004), 0.80), skinMat);
    forearm.position.y = -0.11;
    forearm.castShadow = true;
    forearmGroup.add(forearm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), skinMat);
    hand.position.set(0, -0.26, 0.02);
    hand.castShadow = true;
    forearmGroup.add(hand);

    armGroup.add(forearmGroup);
    return armGroup;
  }

  // Brazo izquierdo (lado derecho de la pantalla): conserva el gesto de audio-sync
  const leftArmGroup = createArm(0.39);
  group.add(leftArmGroup);

  // Brazo derecho (lado izquierdo de la pantalla): apoyado sobre la barra.
  // Hombro fijo, codo sobre la barra y antebrazo tendido hacia el centro.
  const REST_SHOULDER = new THREE.Vector3(-0.39, 1.40, 0.02);
  const REST_ELBOW_BASE = new THREE.Vector3(-0.42, 1.085, 0.15);
  const REST_UPPER_LEN = 0.355;
  const REST_FOREARM_DIR = new THREE.Vector3(0.97, 0, 0.22).normalize();
  const DOWN = new THREE.Vector3(0, -1, 0);

  const restUpper = new THREE.Group();
  restUpper.position.copy(REST_SHOULDER);
  const restSleeve = new THREE.Mesh(
    slopeTop(roundTopOuter(taperDown(bevelBox(0.14, 0.22, 0.16, 0.012, SLEEVE_SPLITS), 0.82),
      -1, 0.05), -1, 0.035), poloRedMat);
  restSleeve.position.y = -0.11;
  restSleeve.castShadow = true;
  const restUpperSkin = new THREE.Mesh(bevelBox(0.10, 0.15, 0.11, 0.006), skinMat);
  restUpperSkin.position.y = -0.285;
  restUpperSkin.castShadow = true;
  restUpper.add(restSleeve, restUpperSkin);

  const restElbow = new THREE.Group();
  const restElbowJoint = new THREE.Mesh(bevelBox(0.11, 0.11, 0.11, 0.008), skinMat);
  restElbowJoint.castShadow = true;
  // Antebrazo que se afina hacia la muñeca: el lado de la barra queda plano y
  // el superior baja, para empalmar con la palma sin un cambio brusco
  const forearmGeo = bevelBox(0.10, 0.26, 0.11, 0.006);
  const fPos = forearmGeo.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    if (fPos.getY(i) < 0) {            // extremo de la muñeca
      if (fPos.getX(i) > 0) fPos.setX(i, 0);
      fPos.setZ(i, fPos.getZ(i) * 0.78);
    }
  }
  const restForearm = new THREE.Mesh(forearmGeo, skinMat);
  restForearm.position.y = -0.13;
  restForearm.castShadow = true;
  restElbow.add(restElbowJoint, restForearm);

  // Mano low-poly (palma que se ensancha hacia los nudillos, dedos de dos
  // segmentos y pulgar angulado). Marco local: -y = hacia las puntas de los
  // dedos, -x = palma hacia la barra, -z = lado del pulgar (mano derecha).
  const HAND_X = -0.03;                  // eje de los dedos, a ras de la barra
  const PALM_X = -0.025;                 // la palma (0.05 de grosor) empalma con el antebrazo
  const PALM_LEN = 0.095;
  const WRIST_Y = -0.26;
  const fingerJoints = [];

  const palmGeo = bevelBox(0.05, PALM_LEN, 0.11, 0.006);
  const palmPos = palmGeo.attributes.position;
  for (let i = 0; i < palmPos.count; i++) {
    // Lado de la muñeca (y > 0) más estrecho: igual que el extremo del antebrazo
    if (palmPos.getY(i) > 0) palmPos.setZ(i, palmPos.getZ(i) * 0.78);
  }
  const palm = new THREE.Mesh(palmGeo, skinMat);
  palm.position.set(PALM_X, WRIST_Y - PALM_LEN / 2 + 0.005, 0);
  palm.castShadow = true;
  restElbow.add(palm);

  const KNUCKLE_Y = WRIST_Y - PALM_LEN + 0.005;
  // [posición z, largo falange 1, largo falange 2, curvatura base]
  const FINGERS = [
    [-0.0375, 0.048, 0.040, 0.04],  // índice
    [-0.0125, 0.054, 0.045, 0.00],  // medio
    [0.0125,  0.050, 0.041, 0.05],  // anular
    [0.0375,  0.040, 0.031, 0.09]   // meñique
  ];
  FINGERS.forEach(([z, l1, l2, curl]) => {
    const finger = new THREE.Group();
    finger.position.set(HAND_X, KNUCKLE_Y, z);
    const seg1 = new THREE.Mesh(bevelBox(0.040, l1, 0.022, 0.003), skinMat);
    seg1.position.y = -l1 / 2;
    seg1.castShadow = true;
    const joint = new THREE.Group();
    joint.position.y = -l1;
    joint.rotation.z = curl;
    const seg2 = new THREE.Mesh(bevelBox(0.036, l2, 0.020, 0.003), skinMat);
    seg2.position.y = -l2 / 2;
    seg2.castShadow = true;
    joint.add(seg2);
    finger.add(seg1, joint);
    restElbow.add(finger);
    fingerJoints.push({ joint, base: curl });
  });

  // Pulgar: nace cerca de la muñeca y se abre hacia el lado -z
  const thumb = new THREE.Group();
  thumb.position.set(HAND_X, WRIST_Y - 0.03, -0.050);
  thumb.rotation.x = 0.75;
  const thumbSeg1 = new THREE.Mesh(bevelBox(0.040, 0.058, 0.030, 0.004), skinMat);
  thumbSeg1.position.y = -0.029;
  thumbSeg1.castShadow = true;
  const thumbJoint = new THREE.Group();
  thumbJoint.position.y = -0.058;
  thumbJoint.rotation.x = 0.25;
  const thumbSeg2 = new THREE.Mesh(bevelBox(0.036, 0.045, 0.028, 0.004), skinMat);
  thumbSeg2.position.y = -0.0225;
  thumbSeg2.castShadow = true;
  thumbJoint.add(thumbSeg2);
  thumb.add(thumbSeg1, thumbJoint);
  restElbow.add(thumb);
  restElbow.position.copy(REST_ELBOW_BASE);
  group.add(restUpper, restElbow);

  // Estado del movimiento sutil del brazo apoyado
  const restOffset = new THREE.Vector3();
  const restTarget = new THREE.Vector3();
  const restTmpElbow = new THREE.Vector3();
  const restTmpDir = new THREE.Vector3();
  let restLift = 0;
  let restNextShift = 0;

  function updateRestingArm(t, dt, speaking, openAmount) {
    // Cada 6-12 s se acomoda unos centímetros
    if (restNextShift === 0) restNextShift = t + 4 + Math.random() * 4;
    if (t >= restNextShift) {
      restTarget.set((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.04);
      restNextShift = t + 6 + Math.random() * 6;
    }
    restOffset.lerp(restTarget, 1 - Math.exp(-dt * 1.2));

    // Al hablar levanta muy poco la muñeca y el codo; al callar vuelve a apoyarse
    const liftTarget = speaking ? 0.03 + 0.07 * openAmount : 0;
    restLift += (liftTarget - restLift) * (1 - Math.exp(-dt * 4));

    // Deriva lenta y mínima para que no parezca inerte
    restTmpElbow.set(
      REST_ELBOW_BASE.x + restOffset.x + Math.sin(t * 0.5) * 0.004,
      REST_ELBOW_BASE.y + restLift * 0.12,
      REST_ELBOW_BASE.z + restOffset.z + Math.cos(t * 0.37) * 0.004
    );
    restElbow.position.copy(restTmpElbow);

    // Brazo superior: del hombro al codo
    restTmpDir.copy(restTmpElbow).sub(REST_SHOULDER);
    const len = restTmpDir.length();
    restUpper.scale.y = len / REST_UPPER_LEN;
    restUpper.quaternion.setFromUnitVectors(DOWN, restTmpDir.normalize());

    // Antebrazo: tendido sobre la barra, la muñeca sube con restLift
    restTmpDir.copy(REST_FOREARM_DIR);
    restTmpDir.y += restLift;
    restTmpDir.z += Math.sin(t * 0.45) * 0.02;
    restElbow.quaternion.setFromUnitVectors(DOWN, restTmpDir.normalize());

    // Dedos con micro-movimiento: se levantan un poco al hablar
    fingerJoints.forEach((f, i) => {
      f.joint.rotation.z = f.base + Math.sin(t * 0.8 + i * 1.3) * 0.025 + restLift * 0.5;
    });
  }
  updateRestingArm(0, 0.016, false, 0); // pose inicial apoyada antes de que suene el audio

  // 3. CABEZA
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.76;

  // Cabeza FIJA (la mandíbula no baja al hablar): una sola pieza, sin costuras,
  // modelada moviendo los vértices de una caja con chaflán. Planos principales:
  //  - mandíbula: desde TAPER_START baja afinándose; atrás conserva ancho (ángulo
  //    de la mandíbula) y adelante se cierra a una barbilla angosta, lo que dibuja
  //    una arista diagonal desde la oreja hasta la barbilla
  //  - mentón: la base sube hacia atrás (plano inclinado bajo la barbilla)
  //  - cráneo: la coronilla se estrecha y la frente, sobre las cejas, se inclina atrás
  // La cara frontal (de la barbilla a las cejas) queda plana en z = 0.19, así los
  // ojos, las gafas y la boca siguen alineados.
  const HEAD_TOP = 0.28;
  const HEAD_BOTTOM = -0.225;
  const TAPER_START = -0.02;             // el lateral es recto desde la frente hasta aquí (bajo la nariz)
  const JAW_BACK_SCALE = 0.85;           // ancho del ángulo de la mandíbula (atrás)
  const CHIN_SCALE = 0.50;               // ancho de la barbilla (adelante)
  const JAW_BACK_PULL = 0.30;            // cuánto se adelanta la base atrás (proporción de z)
  const CHIN_PLANE_LIFT = 0.11;          // cuánto sube la base atrás (plano inclinado bajo la barbilla)
  const CROWN_START = 0.15;              // desde aquí la coronilla se estrecha
  const CROWN_NARROW = 0;                // 0 = los lados bajan rectos desde la frente
  const FOREHEAD_START = 0.235;          // por encima de las cejas la frente se inclina
  const FOREHEAD_TILT = 0.03;            // cuánto retrocede la frente en el borde superior
  const headCenterY = (HEAD_TOP + HEAD_BOTTOM) / 2;
  // Vértices extra en TAPER_START y FOREHEAD_START para que los quiebres (donde
  // empieza la mandíbula y la inclinación de la frente) sean reales y no una
  // diagonal que cruce toda la cara
  const skullGeo = bevelBox(0.46, HEAD_TOP - HEAD_BOTTOM, 0.38, 0.011,
    [TAPER_START - headCenterY, FOREHEAD_START - headCenterY]);
  const skullPos = skullGeo.attributes.position;
  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
  for (let i = 0; i < skullPos.count; i++) {
    let x = skullPos.getX(i);
    let y = skullPos.getY(i) + headCenterY;     // y en el espacio de la cabeza
    let z = skullPos.getZ(i);
    const zN = clamp01((z + 0.19) / 0.38);       // 0 atrás, 1 adelante
    const t = clamp01((TAPER_START - y) / (TAPER_START - HEAD_BOTTOM));   // 0 arriba, 1 abajo

    // Mandíbula: ancho menor adelante (barbilla) que atrás (ángulo mandibular)
    const jawScale = JAW_BACK_SCALE + (CHIN_SCALE - JAW_BACK_SCALE) * zN;
    x *= 1 - (1 - jawScale) * t;
    // Atrás, la base se adelanta (perfil en diagonal) y sube (plano bajo la barbilla)
    if (z < 0) z *= 1 - JAW_BACK_PULL * t;
    y += CHIN_PLANE_LIFT * (1 - zN) * t;

    // Coronilla más estrecha
    const crown = clamp01((y - CROWN_START) / (HEAD_TOP - CROWN_START));
    x *= 1 - CROWN_NARROW * crown;
    // Frente inclinada hacia atrás por encima de las cejas
    if (z > 0) z -= FOREHEAD_TILT * clamp01((y - FOREHEAD_START) / (HEAD_TOP - FOREHEAD_START));

    skullPos.setXYZ(i, x, y - headCenterY, z);
  }
  skullPos.needsUpdate = true;
  skullGeo.computeVertexNormals();
  const skull = new THREE.Mesh(skullGeo, skinMat);
  skull.position.y = headCenterY;
  skull.castShadow = true;
  skull.receiveShadow = true;
  headGroup.add(skull);

  // Orejas
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 0.06), skinShadeMat);
  earL.position.set(0.24, 0.04, 0.0);
  const earR = earL.clone();
  earR.position.x = -0.24;
  headGroup.add(earL, earR);

  // Cabello voxel: InstancedMesh de cubitos con variación de altura y tono
  const rnd = seededRandom(20240611);
  const VOX = 0.05;
  const grayTones = [0xB5BAC4, 0xA2A8B4, 0xCDD1D8, 0x93A6B0];
  const sideTones = [0x8A94A2, 0x767C88, 0x9BAEBA];   // más claros: en sombra no se ven como un hueco negro
  const cells = [];

  // Parte superior (dos capas, la superior irregular)
  for (let ix = -4; ix <= 4; ix++) {
    for (let iz = -3; iz <= 3; iz++) {
      cells.push({ x: ix * VOX, y: 0.30, z: iz * VOX - 0.01, tone: grayTones });
      if (Math.abs(ix) < 4 && Math.abs(iz) < 3 && rnd() > 0.5) {
        cells.push({ x: ix * VOX, y: 0.345, z: iz * VOX - 0.01, tone: grayTones });
      }
    }
  }
  // Flequillo corto al frente
  for (let ix = -3; ix <= 3; ix++) {
    if (rnd() > 0.25) cells.push({ x: ix * VOX, y: 0.29, z: 0.17, tone: grayTones });
  }
  // Pelo lateral: cubitos bajos, pegados al cuero cabelludo. Sobresalen poco de
  // la cabeza (entre 0.008 y 0.020) y cada uno varía en grosor, alto y largo.
  // Usan su propio generador para no mover el resto del peinado.
  const rndT = seededRandom(5150);
  const between = (a, b) => a + rndT() * (b - a);
  const SKULL_HALF_W = 0.23;
  function sideHairCell(side, y, z) {
    const out = between(0.004, 0.008);              // cuánto sobresale de la cabeza
    const sx = (out + 0.012) / VOX;                 // 0.012 queda dentro del cráneo
    const sy = between(1.0, 1.3);
    const sz = between(1.0, 1.25);
    return {
      x: side * (SKULL_HALF_W + out - sx * VOX / 2),
      y: y + between(-0.006, 0.006),
      z: z + between(-0.006, 0.006),
      scale: [sx, sy, sz],
      tone: sideTones
    };
  }
  // Laterales sal y pimienta
  [-1, 1].forEach(side => {
    for (let iz = -3; iz <= 1; iz++) {
      [0.26, 0.21, 0.17].forEach((y, idx) => {
        // Las dos filas altas van siempre completas (sin huecos junto a la frente);
        // solo la más baja es irregular. rnd() se consume igual que antes para
        // que el resto del peinado no cambie.
        const r = idx === 0 ? 1 : rnd();
        if (idx < 2 || r > 0.3) {
          cells.push(sideHairCell(side, y, iz * VOX - 0.02));
        }
      });
    }
  });
  // Nuca
  for (let ix = -4; ix <= 4; ix++) {
    [0.25, 0.20, 0.15, 0.10].forEach((y, idx) => {
      if (idx < 2 || rnd() > 0.45) {
        cells.push({ x: ix * VOX, y, z: -0.20, tone: sideTones });
      }
    });
  }
  // Sienes: el pelo lateral baja en escalón hacia la frente (más bajo que el resto).
  // Va al final de la lista para no alterar los tonos de los cubitos anteriores.
  [-1, 1].forEach(side => {
    [[2, [0.26, 0.21]], [3, [0.24, 0.19]], [4, [0.22]]].forEach(([iz, ys]) => {
      ys.forEach(y => cells.push(sideHairCell(side, y, iz * VOX - 0.02)));
    });
  });

  const hair = new THREE.InstancedMesh(new THREE.BoxGeometry(VOX, VOX, VOX), hairVoxelMat, cells.length);
  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  cells.forEach((c, i) => {
    dummy.position.set(c.x, c.y, c.z);
    if (c.scale) dummy.scale.set(c.scale[0], c.scale[1], c.scale[2]); else dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    hair.setMatrixAt(i, dummy.matrix);
    tmpColor.setHex(c.tone[Math.floor(rnd() * c.tone.length)]);
    hair.setColorAt(i, tmpColor);
  });
  hair.instanceMatrix.needsUpdate = true;
  if (hair.instanceColor) hair.instanceColor.needsUpdate = true;
  hair.castShadow = true;
  hair.receiveShadow = true;
  headGroup.add(hair);

  // Nariz angulosa
  const nose = new THREE.Mesh(bevelBox(0.055, 0.08, 0.06, 0.003), skinMat);
  nose.position.set(0, 0.05, 0.215);
  nose.castShadow = true;
  headGroup.add(nose);
  const noseTip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.04), skinShadeMat);
  noseTip.position.set(0, 0.01, 0.235);
  headGroup.add(noseTip);

  // Ojos entrecerrados con párpado y ceja gruesa
  // Referencias para la animación autónoma (parpadeo, mirada, cejas)
  const pupils = [];
  const lids = [];
  const brows = [];
  const BROW_BASE_Y = 0.115;
  const LID_H = 0.07;

  function createEye(x) {
    const eye = new THREE.Group();
    eye.position.set(x, 0.10, 0.195);
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.065, 0.02), whiteMat);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), darkMat);
    p.position.set(0, -0.002, 0.002);
    // Párpado (piel) que baja desde arriba al parpadear
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.095, LID_H, 0.016), skinMat);
    lid.position.set(0, LID_H / 2, 0.012);
    lid.scale.y = 0.001;
    lid.visible = false;
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.032, 0.04), browMat);
    brow.position.set(0, BROW_BASE_Y, 0.015);
    brow.rotation.z = x > 0 ? 0.05 : -0.05;
    eye.add(w, p, lid, brow);
    pupils.push(p);
    lids.push(lid);
    brows.push(brow);
    return eye;
  }
  headGroup.add(createEye(-0.11), createEye(0.11));

  // Gafas gruesas rectangulares
  const glassesGroup = new THREE.Group();
  glassesGroup.position.set(0, 0.10, 0.215);

  function createLensRim(xPos) {
    const rimGroup = new THREE.Group();
    rimGroup.position.set(xPos, 0, 0);

    const topBar = new THREE.Mesh(bevelBox(0.17, 0.03, 0.04, 0.004), glassesFrameMat);
    topBar.position.y = 0.06;
    const botBar = new THREE.Mesh(bevelBox(0.17, 0.03, 0.04, 0.004), glassesFrameMat);
    botBar.position.y = -0.06;
    const leftBar = new THREE.Mesh(bevelBox(0.03, 0.12, 0.04, 0.004), glassesFrameMat);
    leftBar.position.x = -0.07;
    const rightBar = new THREE.Mesh(bevelBox(0.03, 0.12, 0.04, 0.004), glassesFrameMat);
    rightBar.position.x = 0.07;
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.01), glassesLensMat);

    rimGroup.add(topBar, botBar, leftBar, rightBar, lens);
    return rimGroup;
  }

  const leftRim = createLensRim(0.11);
  const rightRim = createLensRim(-0.11);
  const bridge = new THREE.Mesh(bevelBox(0.06, 0.03, 0.04, 0.004), glassesFrameMat);
  bridge.position.set(0, 0.035, 0);
  const templeL = new THREE.Mesh(bevelBox(0.025, 0.03, 0.22, 0.003), glassesFrameMat);
  templeL.position.set(0.225, 0.04, -0.11);
  const templeR = new THREE.Mesh(bevelBox(0.025, 0.03, 0.22, 0.003), glassesFrameMat);
  templeR.position.set(-0.225, 0.04, -0.11);

  glassesGroup.add(leftRim, rightRim, bridge, templeL, templeR);
  headGroup.add(glassesGroup);

  // Comisuras hacia arriba: refuerzan la sonrisa (fijas)
  const cornerL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.01), skinShadeMat);
  cornerL.position.set(0.10, -0.10, 0.195);
  cornerL.rotation.z = 0.5;
  const cornerR = cornerL.clone();
  cornerR.position.x = -0.10;
  cornerR.rotation.z = -0.5;
  headGroup.add(cornerL, cornerR);

  // Boca: una franja oscura que solo cambia de forma según habla
  const MOUTH_TOP = 0.011;      // el borde superior queda fijo
  const MOUTH_W_CLOSED = 0.15;
  const MOUTH_H_CLOSED = 0.022;
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.105, 0.20);

  const mouthStrip = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x5A1620 })
  );
  const mouthTeeth = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.02), whiteMat);
  mouthTeeth.position.z = 0.004;
  // Extremos de la franja: se levantan en reposo para dibujar una ligera sonrisa
  const mouthEndL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), mouthStrip.material);
  const mouthEndR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), mouthStrip.material);
  mouthGroup.add(mouthStrip, mouthTeeth, mouthEndL, mouthEndR);
  headGroup.add(mouthGroup);

  group.add(headGroup);

  // ---------- ANIMACIÓN AUTÓNOMA (parpadeo, miradas, boca, cejas) ----------
  // Visemas simplificados: apertura (o) y anchura (w) de la franja de la boca
  const VISEMES = [
    { o: 0.15, w: 1.05 }, // casi cerrada (m, b, p)
    { o: 0.90, w: 0.80 }, // "a" / "o" abiertas
    { o: 0.55, w: 1.20 }, // "e" / "i" anchas
    { o: 0.75, w: 0.70 }, // "o" / "u" redondeadas
    { o: 0.35, w: 1.00 },
    { o: 1.00, w: 0.90 }
  ];

  // Estados de mirada: pupila (px, py), cuánto compensa el giro de cabeza que
  // impone audio-sync (yawF), giro extra (yawAdd), cabeceo y párpado semicerrado
  const GAZE_STATES = {
    partner: { px: 0.018,  py: 0,      yawF: 0.0, yawAdd: 0.05,  pitch: 0,     lid: 0,    minT: 2.0, maxT: 3.8 },
    camera:  { px: 0,      py: 0,      yawF: 0.9, yawAdd: 0,     pitch: 0,     lid: 0,    minT: 1.6, maxT: 3.2 },
    down:    { px: 0.006,  py: -0.010, yawF: 0.4, yawAdd: 0,     pitch: 0.08,  lid: 0.35, minT: 0.8, maxT: 1.5 },
    aside:   { px: -0.015, py: 0.006,  yawF: 0.5, yawAdd: -0.04, pitch: -0.03, lid: 0,    minT: 0.8, maxT: 1.4 },
    up:      { px: 0.008,  py: 0.010,  yawF: 0.5, yawAdd: 0.02,  pitch: -0.05, lid: 0,    minT: 0.8, maxT: 1.4 }
  };
  const GAZE_NEXT = {
    partner: ['camera', 'down', 'camera', 'aside'],
    camera:  ['partner', 'partner', 'down', 'aside'],
    down:    ['partner', 'camera', 'camera'],
    aside:   ['partner', 'camera'],
    up:      ['partner', 'camera']
  };
  // Mirada pedida por el guion: 'camera', 'partner', 'think' (ojos vagando sin ver nada) o null (automática)
  let forcedGaze = null;
  const THINK_GAZES = ['aside', 'down', 'up', 'aside'];

  let mouthOpen = 0;       // 0 = cerrada, 1 = muy abierta
  let mouthWide = 1;       // factor de anchura
  let mouthTarget = 0;
  let wideTarget = 1;
  let speakLevel = 0;      // 0 = callado, 0..1 = volumen normalizado
  let volumePeak = 0.02;
  let nextVisemeAt = 0;
  let visemeOpen = 0;

  let lastT = null;
  let blinkStart = -1;
  let nextBlinkAt = 0;
  let gazeName = 'camera';
  let gazeUntil = 0;
  const g = { px: 0, py: 0, yawF: 0, yawAdd: 0, pitch: 0, lid: 0 };

  function applyMouth() {
    const w = MOUTH_W_CLOSED * (1 - mouthOpen * 0.10) * mouthWide;
    const h = MOUTH_H_CLOSED + mouthOpen * 0.055;
    mouthStrip.scale.set(w, h, 1);
    mouthStrip.position.y = MOUTH_TOP - h / 2;

    // Sonrisa ligera en reposo: desaparece al abrir la boca para hablar
    const smile = 1 - Math.min(mouthOpen * 3, 1);
    const endY = MOUTH_TOP - MOUTH_H_CLOSED / 2 + smile * 0.011;
    const endX = w / 2 + 0.010;
    mouthEndL.position.set(-endX, endY, 0);
    mouthEndR.position.set(endX, endY, 0);
    mouthEndL.rotation.z = -smile * 0.55;
    mouthEndR.rotation.z = smile * 0.55;
    mouthEndL.visible = mouthEndR.visible = smile > 0.05;

    const showTeeth = mouthOpen > 0.3;
    mouthTeeth.visible = showTeeth;
    if (showTeeth) {
      const th = Math.min(0.02, h * 0.4);
      mouthTeeth.scale.set(w * 0.86, th, 1);
      mouthTeeth.position.y = MOUTH_TOP - th / 2 - 0.002;
    }
  }
  applyMouth();

  function tick() {
    const t = performance.now() / 1000;
    if (lastT === null) {
      lastT = t;
      nextBlinkAt = t + 1.5 + Math.random() * 2;
      gazeUntil = t + 1.5;
    }
    const dt = Math.min(t - lastT, 0.1);
    lastT = t;

    updateRestingArm(t, dt, speakLevel > 0, mouthOpen);

    // --- Mirada: pasa por compañero, cámara, abajo y de lado sin quedarse fija ---
    if (forcedGaze === 'camera' || forcedGaze === 'partner') {
      gazeName = forcedGaze;
      gazeUntil = t + 0.3;
    } else if (forcedGaze === 'think') {
      if (t >= gazeUntil || !THINK_GAZES.includes(gazeName)) {
        gazeName = THINK_GAZES[Math.floor(Math.random() * THINK_GAZES.length)];
        gazeUntil = t + 0.9 + Math.random() * 1.3;
      }
    } else if (t >= gazeUntil) {
      const options = GAZE_NEXT[gazeName];
      gazeName = options[Math.floor(Math.random() * options.length)];
      const st = GAZE_STATES[gazeName];
      gazeUntil = t + st.minT + Math.random() * (st.maxT - st.minT);
    }
    const target = GAZE_STATES[gazeName];
    const gk = 1 - Math.exp(-dt * 9);
    g.px += (target.px - g.px) * gk;
    g.py += (target.py - g.py) * gk;
    g.yawF += (target.yawF - g.yawF) * gk;
    g.yawAdd += (target.yawAdd - g.yawAdd) * gk;
    g.pitch += (target.pitch - g.pitch) * gk;
    g.lid += (target.lid - g.lid) * gk;
    pupils.forEach(p => { p.position.x = g.px; p.position.y = -0.002 + g.py; });

    // --- Parpadeo cada 2.5 - 5.5 s (más el párpado caído al mirar abajo) ---
    if (blinkStart < 0 && t >= nextBlinkAt) blinkStart = t;
    let blink = 0;
    if (blinkStart >= 0) {
      const k = (t - blinkStart) / 0.16;
      if (k >= 1) {
        blinkStart = -1;
        nextBlinkAt = t + 2.5 + Math.random() * 3;
      } else {
        blink = 1 - Math.abs(2 * k - 1);
      }
    }
    const lidAmount = Math.max(blink, g.lid);
    lids.forEach(lid => {
      const s = Math.max(lidAmount, 0.001);
      lid.scale.y = s;
      lid.position.y = LID_H / 2 - (LID_H * s) / 2; // el borde superior queda fijo
      lid.visible = lidAmount > 0.03;
    });

    // --- Boca: cambia de visema cada 70-160 ms mientras hay voz ---
    if (speakLevel > 0) {
      if (t >= nextVisemeAt) {
        const v = VISEMES[Math.floor(Math.random() * VISEMES.length)];
        visemeOpen = v.o;
        wideTarget = v.w;
        nextVisemeAt = t + 0.07 + Math.random() * 0.09;
      }
      mouthTarget = Math.min(1, speakLevel * (0.25 + 0.9 * visemeOpen));
    } else {
      mouthTarget = 0;
      wideTarget = 1;
    }
    const mk = 1 - Math.exp(-dt * 30);
    mouthOpen += (mouthTarget - mouthOpen) * mk;
    mouthWide += (wideTarget - mouthWide) * mk;
    applyMouth();

    // --- Cejas con micro-expresión ---
    const browLift = mouthOpen * 0.006 + Math.max(g.px, 0) * 0.2;
    brows.forEach(b => { b.position.y = BROW_BASE_Y + browLift; });
  }

  // Bucle propio: parpadeo y mirada siguen vivos también en reposo (fuera de la reproducción)
  function bucle() {
    tick();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(bucle);
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(bucle);

  return {
    group,
    setGazeMode: (modo) => { forcedGaze = modo || null; },
    // La boca ya no mueve la mandíbula: solo cambia la forma de la franja
    setJawOpen: (offsetY) => {
      volumePeak = Math.max(volumePeak * 0.998, offsetY, 0.01);
      speakLevel = offsetY > 0.004 ? Math.min(offsetY / volumePeak, 1) : 0;
    },
    setHeadAngles: (rotY, rotX, breathY = 0) => {
      headGroup.rotation.y = rotY * (1 - g.yawF) + g.yawAdd;
      headGroup.rotation.x = rotX + g.pitch;
      torso.position.y = 1.15 + breathY;
    },
    setArmGesture: (angle) => {
      leftArmGroup.rotation.x = angle;
      leftArmGroup.rotation.z = angle * 0.2;
    }
  };
}
