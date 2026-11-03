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

export function createSamario() {
  const group = new THREE.Group();
  group.position.set(-0.52, 0, -0.15);

  // PALETA CROMÁTICA PERSONALIZADA
  const skinMat = new THREE.MeshStandardMaterial({ 
    color: 0xDE9B75, 
    map: sharedTexture, 
    roughness: 0.65, 
    flatShading: true 
  });
  const hairGrayMat = new THREE.MeshStandardMaterial({ 
    color: 0xB5BAC4, // Gris plateado / cano moderno
    map: sharedTexture, 
    roughness: 0.8, 
    flatShading: true 
  });
  const hairDarkMat = new THREE.MeshStandardMaterial({ 
    color: 0x585B64, // Lateral sal y pimienta
    roughness: 0.85, 
    flatShading: true 
  });
  const poloRedMat = new THREE.MeshStandardMaterial({ 
    color: 0x992437, // Polo carmesí / vinotinto
    map: sharedTexture, 
    roughness: 0.7, 
    flatShading: true 
  });
  const poloCollarMat = new THREE.MeshStandardMaterial({ 
    color: 0x7A1A2A, 
    roughness: 0.75, 
    flatShading: true 
  });
  const jeansMat = new THREE.MeshStandardMaterial({ 
    color: 0x2A3D59, 
    roughness: 0.85, 
    flatShading: true 
  });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1A1C22, roughness: 0.5, flatShading: true });
  const shoeSoleMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3, flatShading: true });

  // Gafas rectangulares ahumadas semitransparentes
  const glassesFrameMat = new THREE.MeshStandardMaterial({ 
    color: 0x3A3F47, 
    roughness: 0.25, 
    metalness: 0.3, 
    transparent: true, 
    opacity: 0.88,
    flatShading: true 
  });
  const glassesLensMat = new THREE.MeshStandardMaterial({ 
    color: 0xDDE8F5, 
    roughness: 0.1, 
    metalness: 0.1, 
    transparent: true, 
    opacity: 0.25 
  });
  const micMat = new THREE.MeshBasicMaterial({ color: 0x111216 }); // Micrófono de solapa
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x15161C });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xF7F7F9, roughness: 0.3, flatShading: true });

  // 1. PIERNAS
  function createLeg(xPos) {
    const legGroup = new THREE.Group();
    legGroup.position.set(xPos, 0, 0);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.72, 6), jeansMat);
    leg.position.y = 0.42;
    leg.rotation.y = Math.PI / 6;
    leg.castShadow = true;
    legGroup.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.28), shoeMat);
    shoe.position.set(0, 0.055, 0.04);
    shoe.castShadow = true;
    legGroup.add(shoe);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.03, 0.29), shoeSoleMat);
    sole.position.set(0, 0.015, 0.04);
    legGroup.add(sole);

    return legGroup;
  }
  group.add(createLeg(-0.16), createLeg(0.16));

  // 2. TORSO CON POLO Y MICRÓFONO
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.14, 0.26), jeansMat);
  pelvis.position.y = 0.82;
  pelvis.castShadow = true;
  group.add(pelvis);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.28), poloRedMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 6), skinMat);
  neck.position.y = 1.48;
  neck.castShadow = true;
  group.add(neck);

  const poloCollar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.24), poloCollarMat);
  poloCollar.position.set(0, 1.44, 0.03);
  group.add(poloCollar);

  const micClip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), micMat);
  micClip.position.set(0, 1.35, 0.15);
  group.add(micClip);

  // 3. BRAZOS
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-0.33, 1.40, 0.02);

  const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 0.16), poloRedMat);
  rSleeve.position.y = -0.10;
  rSleeve.castShadow = true;
  rightArmGroup.add(rSleeve);

  const rForearmGroup = new THREE.Group();
  rForearmGroup.position.set(0, -0.20, 0);
  rForearmGroup.rotation.x = 0.45;

  const rForearmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.26, 0.11), skinMat);
  rForearmMesh.position.y = -0.11;
  rForearmMesh.castShadow = true;
  rForearmGroup.add(rForearmMesh);

  const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), skinMat);
  rHand.position.set(0, -0.26, 0.02);
  rHand.castShadow = true;
  rForearmGroup.add(rHand);
  rightArmGroup.add(rForearmGroup);
  group.add(rightArmGroup);

  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(0.33, 1.40, 0.02);

  const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 0.16), poloRedMat);
  lSleeve.position.y = -0.10;
  lSleeve.castShadow = true;
  leftArmGroup.add(lSleeve);

  const lForearmGroup = new THREE.Group();
  lForearmGroup.position.set(0, -0.20, 0);
  lForearmGroup.rotation.x = 0.45;

  const lForearmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.26, 0.11), skinMat);
  lForearmMesh.position.y = -0.11;
  lForearmMesh.castShadow = true;
  lForearmGroup.add(lForearmMesh);

  const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), skinMat);
  lHand.position.set(0, -0.26, 0.02);
  lHand.castShadow = true;
  lForearmGroup.add(lHand);
  leftArmGroup.add(lForearmGroup);
  group.add(leftArmGroup);

  // 4. CABEZA
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.76;

  const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.23, 0.42, 8), skinMat);
  skull.position.y = 0.06;
  skull.scale.set(1.0, 1.0, 0.88);
  skull.castShadow = true;
  skull.receiveShadow = true;
  headGroup.add(skull);

  // Cabello cano superior y laterales
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.38), hairGrayMat);
  hairTop.position.set(0, 0.28, -0.01);
  hairTop.castShadow = true;
  headGroup.add(hairTop);

  const hairFront = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.12), hairGrayMat);
  hairFront.position.set(0, 0.24, 0.16);
  hairFront.rotation.x = 0.12;
  headGroup.add(hairFront);

  const hairSideL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.36), hairDarkMat);
  hairSideL.position.set(0.24, 0.14, -0.02);
  const hairSideR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.36), hairDarkMat);
  hairSideR.position.set(-0.24, 0.14, -0.02);
  headGroup.add(hairSideL, hairSideR);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.11), skinMat);
  nose.position.set(0, 0.05, 0.22);
  nose.castShadow = true;
  headGroup.add(nose);

  function createEye(x) {
    const eye = new THREE.Group();
    eye.position.set(x, 0.11, 0.205);
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), whiteMat);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.025), darkMat);
    p.position.set(x > 0 ? -0.015 : 0.015, -0.01, 0.005);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.03), hairDarkMat);
    brow.position.set(0, 0.065, 0.01);
    brow.rotation.z = x > 0 ? -0.06 : 0.06;
    eye.add(w, p, brow);
    return eye;
  }
  headGroup.add(createEye(-0.11), createEye(0.11));

  // Gafas rectangulares
  const glassesGroup = new THREE.Group();
  glassesGroup.position.set(0, 0.11, 0.23);

  function createLensRim(xPos) {
    const rimGroup = new THREE.Group();
    rimGroup.position.set(xPos, 0, 0);

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.03), glassesFrameMat);
    topBar.position.y = 0.055;
    const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.03), glassesFrameMat);
    botBar.position.y = -0.055;
    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.03), glassesFrameMat);
    leftBar.position.x = -0.06;
    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.03), glassesFrameMat);
    rightBar.position.x = 0.06;
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.01), glassesLensMat);

    rimGroup.add(topBar, botBar, leftBar, rightBar, lens);
    return rimGroup;
  }

  const leftRim = createLensRim(0.11);
  const rightRim = createLensRim(-0.11);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.03), glassesFrameMat);
  bridge.position.set(0, 0.03, 0);
  const templeL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.22), glassesFrameMat);
  templeL.position.set(0.20, 0.04, -0.10);
  const templeR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.22), glassesFrameMat);
  templeR.position.set(-0.20, 0.04, -0.10);

  glassesGroup.add(leftRim, rightRim, bridge, templeL, templeR);
  headGroup.add(glassesGroup);

  // Mandíbula móvil
  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, -0.08, 0.12);

  const mouthBack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.02), new THREE.MeshBasicMaterial({ color: 0x360D12 }));
  mouthBack.position.set(0, 0.01, 0.08);
  jawGroup.add(mouthBack);

  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), whiteMat);
  teeth.position.set(0, 0.03, 0.09);
  jawGroup.add(teeth);

  const chin = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.17, 0.12, 8), skinMat);
  chin.scale.set(1.0, 1.0, 0.75);
  chin.position.set(0, -0.06, 0.07);
  chin.castShadow = true;
  chin.receiveShadow = true;
  jawGroup.add(chin);

  headGroup.add(jawGroup);
  group.add(headGroup);

  return {
    group,
    setJawOpen: (offsetY) => { jawGroup.position.y = -0.08 - offsetY; },
    setHeadAngles: (rotY, rotX, breathY = 0) => { 
      headGroup.rotation.y = rotY; 
      headGroup.rotation.x = rotX;
      torso.position.y = 1.15 + breathY;
    },
    setArmGesture: (angle) => { 
      leftArmGroup.rotation.x = angle; 
      leftArmGroup.rotation.z = angle * 0.2;
    }
  };
}