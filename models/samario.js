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
  const torso = new THREE.Mesh(bevelBox(0.60, 0.56, 0.28, 0.01), poloRedMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Hombros inclinados para romper la silueta rectangular
  const shoulderL = new THREE.Mesh(bevelBox(0.22, 0.09, 0.28, 0.006), poloRedMat);
  shoulderL.position.set(0.22, 1.43, 0);
  shoulderL.rotation.z = -0.35;
  shoulderL.castShadow = true;
  const shoulderR = shoulderL.clone();
  shoulderR.position.x = -0.22;
  shoulderR.rotation.z = 0.35;
  group.add(shoulderL, shoulderR);

  const neck = new THREE.Mesh(bevelBox(0.15, 0.16, 0.14, 0.005), skinShadeMat);
  neck.position.y = 1.50;
  neck.castShadow = true;
  group.add(neck);

  // Cuello de polo: dos solapas anguladas y botón
  const collarL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.20), poloCollarMat);
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
  function createArm(xPos) {
    const armGroup = new THREE.Group();
    armGroup.position.set(xPos, 1.40, 0.02);

    const sleeve = new THREE.Mesh(bevelBox(0.14, 0.22, 0.16, 0.005), poloRedMat);
    sleeve.position.y = -0.10;
    sleeve.castShadow = true;
    armGroup.add(sleeve);

    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.20, 0);
    forearmGroup.rotation.x = 0.45;

    const forearm = new THREE.Mesh(bevelBox(0.10, 0.26, 0.11, 0.004), skinMat);
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
  const leftArmGroup = createArm(0.37);
  group.add(leftArmGroup);

  // Brazo derecho (lado izquierdo de la pantalla): apoyado sobre la barra.
  // Hombro fijo, codo sobre la barra y antebrazo tendido hacia el centro.
  const REST_SHOULDER = new THREE.Vector3(-0.37, 1.40, 0.02);
  const REST_ELBOW_BASE = new THREE.Vector3(-0.40, 1.085, 0.15);
  const REST_UPPER_LEN = 0.355;
  const REST_FOREARM_DIR = new THREE.Vector3(0.97, 0, 0.22).normalize();
  const DOWN = new THREE.Vector3(0, -1, 0);

  const restUpper = new THREE.Group();
  restUpper.position.copy(REST_SHOULDER);
  const restSleeve = new THREE.Mesh(bevelBox(0.14, 0.22, 0.16, 0.005), poloRedMat);
  restSleeve.position.y = -0.11;
  restSleeve.castShadow = true;
  const restUpperSkin = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.15, 0.11), skinMat);
  restUpperSkin.position.y = -0.285;
  restUpperSkin.castShadow = true;
  restUpper.add(restSleeve, restUpperSkin);

  const restElbow = new THREE.Group();
  const restElbowJoint = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), skinMat);
  restElbowJoint.castShadow = true;
  // Antebrazo que se afina hacia la muñeca: el lado de la barra queda plano y
  // el superior baja, para empalmar con la palma sin un cambio brusco
  const forearmGeo = new THREE.BoxGeometry(0.10, 0.26, 0.11);
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

  const palmGeo = new THREE.BoxGeometry(0.05, PALM_LEN, 0.11);
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
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.040, l1, 0.022), skinMat);
    seg1.position.y = -l1 / 2;
    seg1.castShadow = true;
    const joint = new THREE.Group();
    joint.position.y = -l1;
    joint.rotation.z = curl;
    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.036, l2, 0.020), skinMat);
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
  const thumbSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.058, 0.030), skinMat);
  thumbSeg1.position.y = -0.029;
  thumbSeg1.castShadow = true;
  const thumbJoint = new THREE.Group();
  thumbJoint.position.y = -0.058;
  thumbJoint.rotation.x = 0.25;
  const thumbSeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.045, 0.028), skinMat);
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

  // Cráneo en bloque: planos angulosos como en la referencia
  const skull = new THREE.Mesh(bevelBox(0.46, 0.44, 0.38, 0.011), skinMat);
  skull.position.y = 0.06;
  skull.castShadow = true;
  skull.receiveShadow = true;
  headGroup.add(skull);

  // Pómulos elevados por la sonrisa
  const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.03), skinShadeMat);
  cheekL.position.set(0.15, -0.06, 0.195);
  cheekL.rotation.z = 0.25;
  const cheekR = cheekL.clone();
  cheekR.position.x = -0.15;
  cheekR.rotation.z = -0.25;
  headGroup.add(cheekL, cheekR);

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
  const sideTones = [0x6F7A88, 0x585B64, 0x7E94A0];
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
  // Laterales sal y pimienta
  [-1, 1].forEach(side => {
    for (let iz = -3; iz <= 1; iz++) {
      [0.26, 0.21, 0.17].forEach((y, idx) => {
        if (idx === 0 || rnd() > 0.3) {
          cells.push({ x: side * 0.235, y, z: iz * VOX - 0.02, tone: sideTones });
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

  const hair = new THREE.InstancedMesh(new THREE.BoxGeometry(VOX, VOX, VOX), hairVoxelMat, cells.length);
  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  cells.forEach((c, i) => {
    dummy.position.set(c.x, c.y, c.z);
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

  // Mentón FIJO: la mandíbula ya no baja al hablar
  const chin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.34), skinMat);
  chin.position.set(0, -0.14, 0.02);
  chin.castShadow = true;
  chin.receiveShadow = true;
  headGroup.add(chin);

  // Comisuras hacia arriba: refuerzan la sonrisa (fijas)
  const cornerL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), skinShadeMat);
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
    aside:   { px: -0.015, py: 0.006,  yawF: 0.5, yawAdd: -0.04, pitch: -0.03, lid: 0,    minT: 0.8, maxT: 1.4 }
  };
  const GAZE_NEXT = {
    partner: ['camera', 'down', 'camera', 'aside'],
    camera:  ['partner', 'partner', 'down', 'aside'],
    down:    ['partner', 'camera', 'camera'],
    aside:   ['partner', 'camera']
  };

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
    if (t >= gazeUntil) {
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

  return {
    group,
    // La boca ya no mueve la mandíbula: solo cambia la forma de la franja
    setJawOpen: (offsetY) => {
      volumePeak = Math.max(volumePeak * 0.998, offsetY, 0.01);
      speakLevel = offsetY > 0.004 ? Math.min(offsetY / volumePeak, 1) : 0;
    },
    setHeadAngles: (rotY, rotX, breathY = 0) => {
      tick(); // parpadeo, miradas, boca y cejas (una vez por fotograma)
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
