function createClayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 256);

  // Micro-porosidad de cerámica artesanal
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

const clayTexture = createClayTexture();

export function createTostadito() {
  const group = new THREE.Group();
  group.position.set(0.42, 1.03, 0.35);

  const cupMat = new THREE.MeshStandardMaterial({ 
    color: 0xF5F6FA, 
    map: clayTexture,
    roughness: 0.45, 
    flatShading: true 
  });
  const espressoMat = new THREE.MeshStandardMaterial({ 
    color: 0x1A0D07, 
    roughness: 0.2, 
    flatShading: true 
  });
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x15161C });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3, flatShading: true });

  // Cuerpo decagonal
  const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.38, 10), cupMat);
  cupBody.position.y = 0.19;
  cupBody.rotation.y = Math.PI / 10;
  cupBody.castShadow = true;
  cupBody.receiveShadow = true;
  group.add(cupBody);

  // Borde biselado
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.235, 0.03, 10), cupMat);
  rim.position.y = 0.38;
  rim.rotation.y = Math.PI / 10;
  rim.castShadow = true;
  group.add(rim);

  // Espresso
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.02, 10), espressoMat);
  liquid.position.y = 0.34;
  liquid.rotation.y = Math.PI / 10;
  liquid.receiveShadow = true;
  group.add(liquid);

  // Asa
  const handleGroup = new THREE.Group();
  handleGroup.position.set(0.18, 0.19, 0);

  const hTop = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.05), cupMat);
  hTop.position.set(0.05, 0.08, 0);
  hTop.castShadow = true;

  const hSide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.05), cupMat);
  hSide.position.set(0.11, 0, 0);
  hSide.castShadow = true;

  const hBottom = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.05), cupMat);
  hBottom.position.set(0.05, -0.08, 0);
  hBottom.castShadow = true;

  handleGroup.add(hTop, hSide, hBottom);
  group.add(handleGroup);

  // Cara
  const faceGroup = new THREE.Group();
  faceGroup.position.set(0, 0.20, 0.236);

  function createEye(x) {
    const eye = new THREE.Group();
    eye.position.set(x, 0.04, 0);
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.015), whiteMat);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.02), darkMat);
    p.position.set(x > 0 ? -0.01 : 0.01, -0.01, 0.005);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), darkMat);
    brow.position.set(0, 0.06, 0.005);
    brow.rotation.z = x > 0 ? -0.15 : 0.15;
    eye.add(w, p, brow);
    return eye;
  }
  faceGroup.add(createEye(-0.08), createEye(0.08));

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.02), darkMat);
  mouth.position.set(0, -0.05, 0);
  faceGroup.add(mouth);

  group.add(faceGroup);

  return {
    group,
    setMouthScale: (scaleY) => { mouth.scale.y = scaleY; },
    setBounce: (y) => { group.position.y = 1.03 + y; },
    setOrientation: (rotY, tiltZ = 0) => { 
      group.rotation.y = rotY;
      group.rotation.z = tiltZ;
    }
  };
}