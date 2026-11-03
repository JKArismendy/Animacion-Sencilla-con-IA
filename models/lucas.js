function createStylizedTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 40 + 10, 1.5);
  }

  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

const sharedTexture = createStylizedTexture();

export function createLucas() {
  const group = new THREE.Group();
  group.position.set(-0.52, 0, -0.15);

  const skinMat = new THREE.MeshStandardMaterial({ 
    color: 0xE8A07A, 
    map: sharedTexture, 
    roughness: 0.65, 
    flatShading: true 
  });
  const beardMat = new THREE.MeshStandardMaterial({ 
    color: 0x6E3520, 
    map: sharedTexture, 
    roughness: 0.85, 
    flatShading: true 
  });
  const capMat = new THREE.MeshStandardMaterial({ 
    color: 0xD92E6F, 
    map: sharedTexture, 
    roughness: 0.5, 
    flatShading: true 
  });
  const shirtMat = new THREE.MeshStandardMaterial({ 
    color: 0xEDEDF2, 
    map: sharedTexture, 
    roughness: 0.7, 
    flatShading: true 
  });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1E222D, roughness: 0.85, flatShading: true });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.5, flatShading: true });
  const shoeSoleMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3, flatShading: true });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xF59E0B, metalness: 0.85, roughness: 0.25 });
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x15161C });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xF7F7F9, roughness: 0.3, flatShading: true });

  // 1. PIERNAS
  function createLeg(xPos) {
    const legGroup = new THREE.Group();
    legGroup.position.set(xPos, 0, 0);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.72, 6), pantsMat);
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

  // 2. TORSO
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.14, 0.26), pantsMat);
  pelvis.position.y = 0.82;
  pelvis.castShadow = true;
  group.add(pelvis);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.28), shirtMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 6), skinMat);
  neck.position.y = 1.48;
  neck.castShadow = true;
  group.add(neck);

  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.016, 6, 12), goldMat);
  chain.rotation.x = Math.PI / 2.3;
  chain.position.set(0, 1.43, 0.06);
  group.add(chain);

  // 3. BRAZOS
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-0.33, 1.40, 0.02);

  const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 0.16), shirtMat);
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

  const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 0.16), shirtMat);
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

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.10), skinMat);
  nose.position.set(0, 0.05, 0.22);
  nose.castShadow = true;
  headGroup.add(nose);

  function createEye(x) {
    const eye = new THREE.Group();
    eye.position.set(x, 0.12, 0.205);
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.02), whiteMat);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.025), darkMat);
    p.position.set(x > 0 ? -0.015 : 0.015, -0.01, 0.005);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.03, 0.03), beardMat);
    brow.position.set(0, 0.07, 0.01);
    brow.rotation.z = x > 0 ? -0.10 : 0.10;
    eye.add(w, p, brow);
    return eye;
  }
  headGroup.add(createEye(-0.12), createEye(0.12));

  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, -0.06, 0.12);
  const mouthBack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: 0x360D12 }));
  mouthBack.position.set(0, 0, 0.09);
  jawGroup.add(mouthBack);

  const lowerJaw = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.16, 8), beardMat);
  lowerJaw.scale.set(1.0, 1.0, 0.75);
  lowerJaw.position.set(0, -0.08, 0.07);
  lowerJaw.castShadow = true;
  lowerJaw.receiveShadow = true;
  jawGroup.add(lowerJaw);
  headGroup.add(jawGroup);

  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.04), beardMat);
  mustache.position.set(0, -0.01, 0.225);
  mustache.castShadow = true;
  headGroup.add(mustache);

  // Gorra y Visera estilizada
  const capDome = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.26, 0.16, 8), capMat);
  capDome.position.set(0, 0.28, 0);
  capDome.scale.set(1.0, 0.9, 0.95);
  capDome.castShadow = true;
  headGroup.add(capDome);

  // Visera con sombra suave recortada
  const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.18), capMat);
  capBrim.rotation.x = 0.06;
  capBrim.position.set(0, 0.23, 0.24);
  capBrim.castShadow = true; // Sombra presente pero controlada
  headGroup.add(capBrim);

  group.add(headGroup);

  return {
    group,
    setJawOpen: (offsetY) => { jawGroup.position.y = -0.06 - offsetY; },
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