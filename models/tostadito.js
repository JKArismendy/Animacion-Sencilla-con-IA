// Superficie del café: centro oscuro, anillo de crema claro y remolino sutil
function createCoffeeTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;

  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0.0, '#1B0C05');
  grad.addColorStop(0.55, '#2E160A');
  grad.addColorStop(0.86, '#5C3118');
  grad.addColorStop(1.0, '#92592D'); // crema en el borde
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Remolino de crema
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.08) {
      const r = 14 + a * 22;
      const ang = a + k * (Math.PI * 2 / 3);
      const x = c + Math.cos(ang) * r;
      const y = c + Math.sin(ang) * r;
      if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(205, 140, 75, 0.22)';
    ctx.lineWidth = 7;
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

const coffeeTexture = createCoffeeTexture();

export function createTostadito() {
  const group = new THREE.Group();
  group.position.set(0.42, 1.03, 0.35);

  // PALETA: mismo estilo facetado de Samario
  const cupMat = new THREE.MeshStandardMaterial({
    color: 0xF5F6FA,
    roughness: 0.45,
    flatShading: true,
    side: THREE.DoubleSide
  });
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x15161C });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xF7F7F9, roughness: 0.3, flatShading: true });
  const browMat = new THREE.MeshStandardMaterial({ color: 0x4A3228, roughness: 0.85, flatShading: true });
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0x5A1620 });

  // 1. CUERPO: prisma de 12 caras rectas con bordes biselados (base y labio)
  const R_BOTTOM = 0.18, R_TOP = 0.24, H = 0.38;
  const wallR = (y) => R_BOTTOM + (R_TOP - R_BOTTOM) * (y / H);
  const profile = [
    [0.000, 0.000], [0.160, 0.000], [wallR(0.02) , 0.020],   // bisel de la base
    [wallR(0.37), 0.370],                                    // pared recta
    [0.2445, 0.385], [0.2405, 0.400],                        // bisel del labio
    [0.2255, 0.400], [0.2215, 0.385],                        // cara superior del labio
    [0.2165, 0.370], [0.2000, 0.120], [0.1500, 0.050],       // pared interior
    [0.000, 0.050]
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const cupBody = new THREE.Mesh(new THREE.LatheGeometry(profile, 12), cupMat);
  cupBody.rotation.y = Math.PI / 12;   // una cara plana queda justo al frente
  cupBody.castShadow = true;
  // Sin receiveShadow: la taza proyectaba sombra sobre sí misma y dejaba rayas (acné de sombra)
  cupBody.receiveShadow = false;
  group.add(cupBody);

  // 2. CAFÉ: hundido bajo el borde, con superficie viva
  const COFFEE_Y = 0.355;
  const coffeeGroup = new THREE.Group();
  coffeeGroup.position.y = COFFEE_Y;
  group.add(coffeeGroup);

  const coffeeSpin = new THREE.Group();   // la textura gira muy despacio
  coffeeGroup.add(coffeeSpin);
  const coffeeMat = new THREE.MeshStandardMaterial({
    map: coffeeTexture,
    roughness: 0.25,
    emissive: 0xFFFFFF,
    emissiveMap: coffeeTexture,
    emissiveIntensity: 0.35
  });
  const coffeeSurface = new THREE.Mesh(new THREE.CircleGeometry(0.2155, 12), coffeeMat);
  coffeeSurface.rotation.x = -Math.PI / 2;
  coffeeSurface.receiveShadow = true;
  coffeeSpin.add(coffeeSurface);

  // Luz cálida que sale del café e ilumina el interior
  const warmLight = new THREE.PointLight(0xFF8A3D, 0.55, 0.9, 2);
  warmLight.position.set(0, COFFEE_Y + 0.08, 0);
  group.add(warmLight);

  // Vapor en cubitos translúcidos (mismo lenguaje voxel que Samario)
  const steamGeo = new THREE.BoxGeometry(1, 1, 1);
  const steam = [];
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xFFF3E6, transparent: true, opacity: 0, depthWrite: false
    });
    const cube = new THREE.Mesh(steamGeo, mat);
    group.add(cube);
    steam.push({
      cube, mat,
      life: 2.6 + Math.random() * 1.2,
      born: -Math.random() * 3,
      x0: 0, z0: 0, seed: Math.random() * 6.28, fresh: true
    });
  }

  // 3. ASA: bloques con esquinas achaflanadas
  const handleGroup = new THREE.Group();
  handleGroup.position.set(0.18, 0.19, 0);

  const hTop = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.05), cupMat);
  hTop.position.set(0.05, 0.08, 0);
  const hSide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.05), cupMat);
  hSide.position.set(0.125, 0, 0);
  const hBottom = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.05), cupMat);
  hBottom.position.set(0.05, -0.08, 0);
  const hCornerTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), cupMat);
  hCornerTop.position.set(0.115, 0.065, 0);
  hCornerTop.rotation.z = -Math.PI / 4;
  const hCornerBottom = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), cupMat);
  hCornerBottom.position.set(0.115, -0.065, 0);
  hCornerBottom.rotation.z = Math.PI / 4;
  [hTop, hSide, hBottom, hCornerTop, hCornerBottom].forEach(m => {
    m.castShadow = true;
    handleGroup.add(m);
  });
  group.add(handleGroup);

  // 4. CARA: mismas piezas y dinámicas que Samario, sobre la cara plana frontal
  const FACE_Y = 0.20;
  const WALL_TILT = Math.atan((R_TOP - R_BOTTOM) / H) * Math.cos(Math.PI / 12);
  const faceGroup = new THREE.Group();
  faceGroup.position.set(0, FACE_Y, wallR(FACE_Y) * Math.cos(Math.PI / 12));
  faceGroup.rotation.x = WALL_TILT;      // sigue la inclinación de la pared
  group.add(faceGroup);

  const pupils = [];
  const lids = [];
  const brows = [];
  const EYE_Y = 0.048;
  const BROW_BASE_Y = EYE_Y + 0.058;   // más separadas de los ojos: expresión abierta
  const LID_H = 0.056;

  function createEye(x) {
    const eye = new THREE.Group();
    eye.position.set(x, EYE_Y, 0);

    const w = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.052, 0.016), whiteMat);
    w.position.z = 0.004;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.030, 0.012), darkMat);
    p.position.set(0, 0, 0.0095);
    // Párpado (del color de la taza) que baja al parpadear
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.066, LID_H, 0.012), cupMat);
    lid.position.set(0, LID_H / 2, 0.0125);
    lid.scale.y = 0.001;
    lid.visible = false;
    eye.add(w, p, lid);
    faceGroup.add(eye);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.014, 0.02), browMat);
    brow.position.set(x, BROW_BASE_Y, 0.006);
    // Extremo interior más alto que el exterior: ceja alegre / curiosa (no enojada)
    brow.rotation.z = x > 0 ? -0.12 : 0.12;
    faceGroup.add(brow);

    pupils.push(p);
    lids.push(lid);
    brows.push(brow);
  }
  createEye(-0.055);
  createEye(0.055);

  // Boca: franja oscura que cambia de forma; sonrisa leve en reposo
  const MOUTH_TOP = 0.008;
  const MOUTH_W_CLOSED = 0.10;
  const MOUTH_H_CLOSED = 0.016;
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.052, 0.004);
  const mouthStrip = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.012), mouthMat);
  const mouthTeeth = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.012), whiteMat);
  mouthTeeth.position.z = 0.003;
  const mouthEndL = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.014, 0.012), mouthMat);
  const mouthEndR = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.014, 0.012), mouthMat);
  mouthGroup.add(mouthStrip, mouthTeeth, mouthEndL, mouthEndR);
  faceGroup.add(mouthGroup);

  // ---------- ANIMACIÓN AUTÓNOMA ----------
  const VISEMES = [
    { o: 0.15, w: 1.05 }, { o: 0.90, w: 0.80 }, { o: 0.55, w: 1.20 },
    { o: 0.75, w: 0.70 }, { o: 0.35, w: 1.00 }, { o: 1.00, w: 0.90 }
  ];

  // Estados de mirada (Tostadito está a la derecha: Samario queda a su izquierda)
  const GAZE_STATES = {
    partner: { px: -0.016, py: 0,      yawF: 0.0, yawAdd: -0.04, pitch: 0,     lid: 0,    minT: 2.5, maxT: 4.5 },
    camera:  { px: 0,      py: 0,      yawF: 0.9, yawAdd: 0,     pitch: 0,     lid: 0,    minT: 0.9, maxT: 1.8 },
    down:    { px: -0.005, py: -0.010, yawF: 0.4, yawAdd: 0,     pitch: 0.06,  lid: 0.35, minT: 0.7, maxT: 1.3 },
    aside:   { px: 0.014,  py: 0.006,  yawF: 0.5, yawAdd: 0.04,  pitch: -0.03, lid: 0,    minT: 0.7, maxT: 1.2 }
  };

  let speakLevel = 0;
  let mouthOpen = 0;
  let mouthWide = 1;
  let mouthTarget = 0;
  let wideTarget = 1;
  let nextVisemeAt = 0;
  let visemeOpen = 0;

  let isTurn = false;       // true mientras audio-sync lo gira hacia Samario (habla)
  let swayPhase = 0;
  let lastT = null;
  let blinkStart = -1;
  let nextBlinkAt = 1.5 + Math.random() * 2;
  let gazeName = 'camera';
  let gazeUntil = 0;
  const g = { px: 0, py: 0, yawF: 0, yawAdd: 0, pitch: 0, lid: 0 };

  // Juego de pupilas: movimientos pequeños sobre la mirada base
  const PUPIL_MAX_X = 0.016;
  const PUPIL_MAX_Y = 0.011;
  let playX = 0, playY = 0, playTX = 0, playTY = 0, nextPlayAt = 0;

  function pickPupilPlay() {
    const r = Math.random();
    if (r < 0.10) {                       // mirada hacia arriba (poco frecuente)
      playTX = (Math.random() - 0.5) * 0.008;
      playTY = PUPIL_MAX_Y;
      return 0.5 + Math.random() * 0.4;
    }
    if (r < 0.45) {                       // un vistazo a un lado
      const side = Math.random() < 0.5 ? -1 : 1;
      playTX = side * (0.008 + Math.random() * 0.008);
      playTY = (Math.random() - 0.5) * 0.006;
      return 0.5 + Math.random() * 0.7;
    }
    if (r < 0.60) {                       // un vistazo hacia abajo
      playTX = (Math.random() - 0.5) * 0.010;
      playTY = -0.007;
      return 0.4 + Math.random() * 0.5;
    }
    playTX = 0;                           // vuelve al centro
    playTY = 0;
    return 0.7 + Math.random() * 1.0;
  }

  function pickGaze() {
    const r = Math.random();
    if (isTurn) {
      // Hablando: casi siempre mira a Samario, a veces a la cámara
      return r < 0.8 ? 'partner' : 'camera';
    }
    // Escuchando / en silencio: reparte la mirada
    if (r < 0.40) return 'camera';
    if (r < 0.80) return 'partner';
    if (r < 0.95) return 'down';
    return 'aside';
  }

  function applyMouth() {
    const w = MOUTH_W_CLOSED * (1 - mouthOpen * 0.10) * mouthWide;
    const h = MOUTH_H_CLOSED + mouthOpen * 0.045;
    mouthStrip.scale.set(w, h, 1);
    mouthStrip.position.y = MOUTH_TOP - h / 2;

    // Sonrisa en reposo: extremos levantados; desaparece al abrir la boca
    const smile = 1 - Math.min(mouthOpen * 3, 1);
    const endY = MOUTH_TOP - MOUTH_H_CLOSED / 2 + smile * 0.009;
    const endX = w / 2 + 0.008;
    mouthEndL.position.set(-endX, endY, 0);
    mouthEndR.position.set(endX, endY, 0);
    mouthEndL.rotation.z = -smile * 0.55;
    mouthEndR.rotation.z = smile * 0.55;
    mouthEndL.visible = mouthEndR.visible = smile > 0.05;

    const showTeeth = mouthOpen > 0.3;
    mouthTeeth.visible = showTeeth;
    if (showTeeth) {
      const th = Math.min(0.016, h * 0.4);
      mouthTeeth.scale.set(w * 0.86, th, 1);
      mouthTeeth.position.y = MOUTH_TOP - th / 2 - 0.002;
    }
  }
  applyMouth();

  function ambient(now) {
    const t = now / 1000;
    if (lastT === null) {
      lastT = t;
      nextBlinkAt = t + 1.5 + Math.random() * 2;
      gazeUntil = t + 1.2;
    }
    const dt = Math.min(t - lastT, 0.1);
    lastT = t;
    swayPhase = t;

    // Café: giro lento de la superficie
    coffeeSpin.rotation.y += dt * 0.18;
    warmLight.intensity = 0.55 + Math.sin(t * 2.3) * 0.06;

    // Vapor de cubitos que suben, crecen y se desvanecen
    steam.forEach(p => {
      let age = (t - p.born) / p.life;
      if (age >= 1 || p.fresh) {
        if (age >= 1) p.born = t;
        p.fresh = false;
        age = Math.max((t - p.born) / p.life, 0);
        p.x0 = (Math.random() - 0.5) * 0.2;
        p.z0 = (Math.random() - 0.5) * 0.2;
        p.life = 2.6 + Math.random() * 1.2;
      }
      p.cube.position.set(
        p.x0 + Math.sin(age * 3.5 + p.seed) * 0.03,
        0.43 + age * 0.5,
        p.z0 + Math.cos(age * 2.7 + p.seed) * 0.03
      );
      const sc = 0.035 + age * 0.07;
      p.cube.scale.set(sc, sc, sc);
      p.cube.rotation.set(age * 2 + p.seed, age * 3 + p.seed, 0);
      p.mat.opacity = Math.sin(Math.min(Math.max(age, 0), 1) * Math.PI) * 0.28;
    });

    // Final del video (últimos 3 s, la invitación a comentar): mira a la cámara
    const audioEl = typeof document !== 'undefined' ? document.getElementById('main-audio') : null;
    const finale = !!audioEl && isFinite(audioEl.duration) && audioEl.duration > 0 &&
      !audioEl.paused && (audioEl.duration - audioEl.currentTime) <= 3.0;
    if (finale) {
      gazeName = 'camera';
      gazeUntil = t + 0.4;
    }

    // Mirada: pasa por Samario, cámara, abajo y de lado
    if (t >= gazeUntil) {
      gazeName = pickGaze();
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
    // Juego de pupilas: cambia de intención cada 0.4 - 1.7 s, sin pasarse de rango
    if (finale) {
      playTX = 0;                         // en el final, pupilas quietas al frente
      playTY = 0;
      nextPlayAt = t + 0.4;
    } else if (t >= nextPlayAt) {
      nextPlayAt = t + pickPupilPlay();
    }
    const pk = 1 - Math.exp(-dt * 14);
    playX += (playTX - playX) * pk;
    playY += (playTY - playY) * pk;
    const px = Math.max(-PUPIL_MAX_X, Math.min(PUPIL_MAX_X, g.px + playX));
    const py = Math.max(-PUPIL_MAX_Y, Math.min(PUPIL_MAX_Y, g.py + playY));
    pupils.forEach(p => { p.position.x = px; p.position.y = py; });

    // Parpadeo cada 2.5 - 5.5 s (más el párpado caído al mirar abajo)
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
      lid.position.y = LID_H / 2 - (LID_H * s) / 2;   // el borde superior queda fijo
      lid.visible = lidAmount > 0.03;
    });

    // Boca: cambia de visema cada 70-160 ms mientras hay voz
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

    // Cejas con micro-expresión
    const browLift = mouthOpen * 0.006 + Math.max(-g.px, 0) * 0.2;
    brows.forEach(b => { b.position.y = BROW_BASE_Y + browLift; });

    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(ambient);
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(ambient);

  return {
    group,
    // audio-sync pasa 1.0 en silencio y 1 + volumen * 3.5 al hablar
    setMouthScale: (scaleY) => {
      speakLevel = scaleY > 1.02 ? Math.min((scaleY - 1) / 2.5, 1) : 0;
    },
    setBounce: (y) => { group.position.y = 1.03 + y; },
    setOrientation: (rotY, tiltZ = 0) => {
      // audio-sync gira la taza hacia Samario (rotY < 0) en su turno
      const turning = rotY < -0.1;
      if (turning !== isTurn) {
        isTurn = turning;
        // Al empezar a hablar, no esperar: va a mirar a Samario enseguida
        if (isTurn && gazeName !== 'partner') gazeUntil = Math.min(gazeUntil, lastT === null ? 0 : lastT + 0.3);
      }
      group.rotation.y = rotY * (1 - g.yawF) + g.yawAdd;
      group.rotation.x = g.pitch;
      // Pequeño balanceo alegre mientras habla
      group.rotation.z = tiltZ + Math.sin(swayPhase * 7) * 0.012 * mouthOpen;
    }
  };
}
