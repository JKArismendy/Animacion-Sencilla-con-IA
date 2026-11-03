export function setupCamera(width, height) {
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);

  // Posiciones base de cada plano cinematográfico
  const targets = {
    WIDE: { 
      pos: new THREE.Vector3(0, 1.55, 4.4), 
      look: new THREE.Vector3(0, 1.35, 0) 
    },
    LUCAS: { 
      pos: new THREE.Vector3(-0.52, 1.82, 2.2), 
      look: new THREE.Vector3(-0.52, 1.78, 0) 
    },
    CUP: { 
      pos: new THREE.Vector3(0.42, 1.30, 1.8), 
      look: new THREE.Vector3(0.42, 1.25, 0.35) 
    }
  };

  const currentPos = new THREE.Vector3().copy(targets.WIDE.pos);
  const currentLook = new THREE.Vector3().copy(targets.WIDE.look);

  camera.position.copy(currentPos);
  camera.lookAt(currentLook);

  // Reloj interno para el movimiento continuo a mano alzada
  let clock = 0;

  return {
    camera,
    update: (shotType) => {
      // Avanzar tiempo del pulso humano
      clock += 0.016; // Aprox. 60 FPS

      const target = targets[shotType] || targets.WIDE;

      // 1. Interpolación suave de transición entre planos
      currentPos.lerp(target.pos, 0.08);
      currentLook.lerp(target.look, 0.08);

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
        currentPos.x + totalShakeX,
        currentPos.y + totalShakeY,
        currentPos.z + (Math.sin(clock * 1.1) * 0.005)
      );

      // 4. El punto de enfoque (lookAt) también tiene un micro-arrastre sutil
      camera.lookAt(
        currentLook.x + totalShakeX * 0.35,
        currentLook.y + totalShakeY * 0.35,
        currentLook.z
      );

      // 5. Inclinación involuntaria de muñeca (Roll leve en el eje Z)
      camera.rotation.z = Math.sin(clock * 1.3) * 0.006 + Math.cos(clock * 3.7) * 0.002;
    }
  };
}