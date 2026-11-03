export function setupScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080D); // Fondo oscuro profundo

  // 1. ILUMINACIÓN EQUILIBRADA Y CONTRASTADA

  // Luz ambiente base baja para mantener sombras profundas sin empastar
  const ambientLight = new THREE.AmbientLight(0x0F1826, 0.75);
  scene.add(ambientLight);

  // KEY LIGHT CÁLIDA / ÁMBAR (En ángulo de 45° a la izquierda, altura media 2.6m)
  // Crea sombra natural bajo la visera, pero bañando los ojos y el rostro sin quemar
  const keyLight = new THREE.SpotLight(0xFFA866, 2.2);
  keyLight.position.set(-1.4, 2.6, 2.2);
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
  const rimLightCyan = new THREE.SpotLight(0x00E5FF, 2.2);
  rimLightCyan.position.set(2.2, 2.6, -1.4);
  rimLightCyan.angle = Math.PI / 2.5;
  rimLightCyan.penumbra = 0.5;
  rimLightCyan.target = targetObj;
  scene.add(rimLightCyan);

  // Kicker secundario azul tenue por el lado izquierdo para definir el hombro oscuro
  const kickerLeft = new THREE.PointLight(0x1D4ED8, 1.0, 5.0);
  kickerLeft.position.set(-2.2, 2.0, -1.0);
  scene.add(kickerLeft);

  // 2. FONDO: PARED Y PIZARRA DE CAFÉ
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0A0D14, roughness: 0.95 });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), wallMat);
  backWall.position.set(0, 3, -2.2);
  scene.add(backWall);

  const boardFrameMat = new THREE.MeshStandardMaterial({ color: 0x2A1A10, roughness: 0.8 });
  const boardFaceMat = new THREE.MeshStandardMaterial({ color: 0x12151D, roughness: 0.7 });

  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 0.04), boardFrameMat);
  boardFrame.position.set(-0.3, 2.6, -2.18);
  scene.add(boardFrame);

  const boardFace = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.45, 0.05), boardFaceMat);
  boardFace.position.set(-0.3, 2.6, -2.17);
  scene.add(boardFace);

  const chalkMat = new THREE.MeshBasicMaterial({ color: 0xC8D3E0 });
  const chalkAccent = new THREE.MeshBasicMaterial({ color: 0xE76F51 });

  const titleLine = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.06), chalkAccent);
  titleLine.position.set(-0.8, 3.1, -2.14);
  scene.add(titleLine);

  for (let i = 0; i < 4; i++) {
    const textBar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.025, 0.06), chalkMat);
    textBar.position.set(-0.75, 2.9 - (i * 0.14), -2.14);
    scene.add(textBar);

    const priceDot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.06), chalkAccent);
    priceDot.position.set(0.6, 2.9 - (i * 0.14), -2.14);
    scene.add(priceDot);
  }

  // 3. BARRA DE CAFETERÍA
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x2E180E, roughness: 0.75 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.95, 1.1), counterMat);
  counter.position.set(0, 0.475, 0.45);
  counter.receiveShadow = true;
  counter.castShadow = true;
  scene.add(counter);

  const counterTopMat = new THREE.MeshStandardMaterial({ color: 0x1E110A, roughness: 0.45 });
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.08, 1.2), counterTopMat);
  counterTop.position.set(0, 0.99, 0.45);
  counterTop.receiveShadow = true;
  scene.add(counterTop);

  // 4. MÁQUINA DE ESPRESSO
  const espressoMachine = new THREE.Group();
  espressoMachine.position.set(1.3, 1.03, 0.35);

  const metalMat = new THREE.MeshStandardMaterial({ 
    color: 0x98A2B3, 
    metalness: 0.85, 
    roughness: 0.25, 
    flatShading: true 
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x16181F, roughness: 0.5 });

  const machineBody = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.65), metalMat);
  machineBody.position.y = 0.275;
  machineBody.castShadow = true;
  machineBody.receiveShadow = true;
  espressoMachine.add(machineBody);

  const topTray = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.60), darkMetalMat);
  topTray.position.y = 0.57;
  espressoMachine.add(topTray);

  for (let i = -0.16; i <= 0.16; i += 0.32) {
    const groupHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.10, 16), metalMat);
    groupHead.position.set(i, 0.25, 0.35);
    espressoMachine.add(groupHead);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 12), darkMetalMat);
    handle.rotation.x = Math.PI / 2.3;
    handle.position.set(i, 0.20, 0.46);
    espressoMachine.add(handle);
  }

  const steamWand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 12), metalMat);
  steamWand.rotation.z = 0.3;
  steamWand.position.set(-0.32, 0.22, 0.35);
  espressoMachine.add(steamWand);

  scene.add(espressoMachine);

  return scene;
}