// extraShots: planos propios definidos en guion.json -> "planos": { NOMBRE: { pos: [x,y,z], mira: [x,y,z] } }
export function setupCamera(width, height, extraShots = {}) {
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);

  // Posiciones base de cada plano cinematográfico
  const targets = {
    WIDE: { 
      pos: new THREE.Vector3(0, 1.55, 4.4), 
      look: new THREE.Vector3(0, 1.35, 0) 
    },
    SAMARIO: { 
      pos: new THREE.Vector3(-0.52, 1.82, 2.2), 
      look: new THREE.Vector3(-0.52, 1.78, 0) 
    },
    CUP: { 
      pos: new THREE.Vector3(0.42, 1.30, 1.8), 
      look: new THREE.Vector3(0.42, 1.25, 0.35) 
    }
  };

  for (const [name, shot] of Object.entries(extraShots)) {
    targets[name] = {
      pos: new THREE.Vector3(...shot.pos),
      look: new THREE.Vector3(...shot.mira)
    };
  }

  // Velocidad de la transición entre planos (fracción recorrida por fotograma)
  const SPEEDS = { corte: 1.0, rapida: 0.16, normal: 0.08, lenta: 0.03 };

  const BASE_FOV = 40;
  const DEG = Math.PI / 180;
  const ease = (p) => p * p * p * (p * (p * 6 - 15) + 10); // arranque y llegada suaves

  // Estado actual de la cámara: posición, punto de mira, zoom, inclinación (roll) y órbita
  const currentPos = new THREE.Vector3().copy(targets.WIDE.pos);
  const currentLook = new THREE.Vector3().copy(targets.WIDE.look);
  const cur = { zoom: 1, roll: 0, orbit: 0 };
  let start = null;       // estado al empezar la orden vigente (para las transiciones con 'dura')
  let activeKey = null;   // identifica la orden vigente para detectar cuándo cambia
  let lastPlano = 'WIDE'; // si una orden no trae plano, se conserva este

  camera.position.copy(currentPos);
  camera.lookAt(currentLook);

  // Reloj interno para el movimiento continuo a mano alzada
  let clock = 0;

  // cue: orden de cámara del timeline {t, plano?, transicion?, dura?, zoom?, inclinacion?, orbita?}
  //      (también acepta solo el nombre de un plano). time: segundos del audio.
  return {
    camera,
    update: (cue = 'WIDE', time = 0) => {
      // Avanzar tiempo del pulso humano
      clock += 0.016; // Aprox. 60 FPS

      if (typeof cue === 'string') cue = { t: -1, plano: cue };
      const plano = cue.plano ?? lastPlano;
      lastPlano = plano;
      const target = targets[plano] || targets.WIDE;
      const goal = {
        zoom: cue.zoom ?? 1,
        roll: (cue.inclinacion ?? 0) * DEG,
        orbit: (cue.orbita ?? 0) * DEG
      };

      // Al cambiar de orden se guarda el punto de partida
      const key = `${cue.t}|${cue.plano}`;
      if (key !== activeKey) {
        activeKey = key;
        start = { pos: currentPos.clone(), look: currentLook.clone(), ...cur };
      }

      if (cue.dura > 0) {
        // 1a. Movimiento con duración exacta en segundos (zoom, empuje, órbita...)
        const e = ease(Math.min(1, Math.max(0, (time - cue.t) / cue.dura)));
        currentPos.lerpVectors(start.pos, target.pos, e);
        currentLook.lerpVectors(start.look, target.look, e);
        for (const k of ['zoom', 'roll', 'orbit']) cur[k] = start[k] + (goal[k] - start[k]) * e;
      } else {
        // 1b. Interpolación suave de transición entre planos (por fotograma)
        const speed = SPEEDS[cue.transicion] ?? SPEEDS.normal;
        currentPos.lerp(target.pos, speed);
        currentLook.lerp(target.look, speed);
        for (const k of ['zoom', 'roll', 'orbit']) cur[k] += (goal[k] - cur[k]) * speed;
      }

      // Zoom: cambia el campo de visión
      const fov = BASE_FOV / cur.zoom;
      if (Math.abs(camera.fov - fov) > 1e-4) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }

      // Órbita: gira la cámara alrededor del punto de mira (grados sobre el eje vertical)
      const orbitPos = cur.orbit
        ? currentPos.clone().sub(currentLook).applyAxisAngle(new THREE.Vector3(0, 1, 0), cur.orbit).add(currentLook)
        : currentPos;

      // 2. Ruido errático multicapa (superposición de frecuencias asimétricas)
      // Capa lenta: deriva natural del cuerpo/respiración del camarógrafo
      const driftX = Math.sin(clock * 0.9) * 0.012 + Math.cos(clock * 1.7) * 0.008;
      const driftY = Math.cos(clock * 0.8) * 0.010 + Math.sin(clock * 2.1) * 0.006;

      // Capa rápida: micro-temblor involuntario de dedos y muñeca
      const jitterX = Math.sin(clock * 4.3) * 0.003 + Math.cos(clock * 7.1) * 0.0015;
      const jitterY = Math.cos(clock * 5.2) * 0.003 + Math.sin(clock * 8.3) * 0.0015;

      const totalShakeX = driftX + jitterX;
      const totalShakeY = driftY + jitterY;

      // 3. Aplicar desfase a la posición de la cámara
      camera.position.set(
        orbitPos.x + totalShakeX,
        orbitPos.y + totalShakeY,
        orbitPos.z + (Math.sin(clock * 1.1) * 0.005)
      );

      // 4. El punto de enfoque (lookAt) también tiene un micro-arrastre sutil
      camera.lookAt(
        currentLook.x + totalShakeX * 0.35,
        currentLook.y + totalShakeY * 0.35,
        currentLook.z
      );

      // 5. Inclinación involuntaria de muñeca (Roll leve en el eje Z)
      camera.rotation.z = Math.sin(clock * 1.3) * 0.006 + Math.cos(clock * 3.7) * 0.002 + cur.roll;
    }
  };
}