// 1. LÍNEA DE TIEMPO
// Se carga desde src/timeline.json, que genera scripts/medir_tiempos.py a partir de guion.json:
//   lineas   -> quién habla y qué dice, con tiempos reales
//   camara   -> cambios de plano (pueden ocurrir a mitad de una línea)
//   acciones -> gestos de los personajes en momentos concretos
let timeline = { lineas: [], camara: [], acciones: [], planos: {} };

export async function loadTimeline(url = './src/timeline.json') {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status}). Ejecuta scripts/construir.py`);
  timeline = await res.json();
  return timeline;
}

// Líneas de diálogo vigentes (las usan los subtítulos)
export function getTimeline() {
  return timeline.lineas;
}

// Plano de cámara vigente en un instante: la última orden cuyo tiempo ya pasó
export function getShotAt(time) {
  let cue = { plano: 'WIDE', transicion: 'normal' };
  for (const c of timeline.camara) {
    if (c.t <= time) cue = c;
    else break;
  }
  return cue;
}

// 2. ANALIZADOR DE VOLUMEN (Web Audio API)
let analyser = null;
let dataArray = null;

export function setupAudioAnalyser(audioElement) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaElementSource(audioElement);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  dataArray = new Uint8Array(analyser.frequencyBinCount);
  return { audioCtx, analyser, source };
}

function getAudioVolume() {
  if (!analyser || !dataArray) return 0;
  analyser.getByteFrequencyData(dataArray);
  let sum = 0;
  const vocalBins = 32;
  for (let i = 0; i < vocalBins; i++) sum += dataArray[i];
  const avg = sum / vocalBins;
  return avg > 12 ? (avg / 255) : 0;
}

// 3. VARIABLES DE ESTADO Y CONTROL DE ACTUACIÓN
let currentSamarioHeadY = 0;
let currentSamarioHeadX = 0;
let currentSamarioArm = 0;
let currentCupRotY = 0;
let currentCupTiltZ = 0;

export function updateActors(time, samario, tostadito) {
  // Línea de diálogo activa (quién habla)
  const current = timeline.lineas.find(s => time >= s.start && time < s.end)
    || { speaker: "None", start: time, end: time + 1 };
  const volume = getAudioVolume();
  const isSpeaking = volume > 0.02;

  const isSamarioTurn = (current.speaker === "Samario");
  const isCupTurn = (current.speaker === "Tostadito");

  // ==========================================
  // --- ACTUACIÓN DE SAMARIO ---
  // ==========================================
  let targetSamarioY = 0;
  let targetSamarioX = 0;
  let targetArm = 0;

  if (isSamarioTurn) {
    // HABLANDO: Mira a Tostadito (derecha), gesticula con el brazo
    targetSamarioY = 0.22;
    targetSamarioX = isSpeaking ? (Math.sin(time * 6) * 0.03) : 0;
    targetArm = 0.20 + (volume * 0.35);
    samario.setJawOpen(volume * 0.12);
  } else {
    // ESCUCHANDO / PAUSA:
    samario.setJawOpen(0);
    targetArm = 0.0; // Brazo descansando en la barra

    if (isCupTurn) {
      // Mirar atentamente a Tostadito con asentimientos suaves y orgánicos
      targetSamarioY = 0.26;
      targetSamarioX = 0.04 + (Math.sin(time * 3.2) * 0.035);
    } else {
      // Silencio general: mirada pensativa al frente
      targetSamarioY = 0.0;
      targetSamarioX = Math.sin(time * 1.5) * 0.02;
    }
  }

  // ==========================================
  // --- ACTUACIÓN DE TOSTADITO ---
  // ==========================================
  let targetCupY = 0;
  let targetCupTilt = 0;
  let cupBounce = 0;

  if (isCupTurn) {
    // HABLANDO: Girado hacia Samario
    targetCupY = -0.28;
    tostadito.setMouthScale(1.0 + volume * 3.5);

    // Salto de énfasis enérgico al inicio de la frase (primeros 0.35 segundos)
    const lineTime = time - current.start;
    if (lineTime < 0.35) {
      cupBounce = Math.sin((lineTime / 0.35) * Math.PI) * 0.045;
    } else if (isSpeaking) {
      cupBounce = volume * 0.015; // Micro-vibración por la potencia de voz
    }
  } else {
    // ESCUCHANDO / PAUSA:
    tostadito.setMouthScale(1.0);
    targetCupY = 0.0;

    // Ladeo curioso y saltito de impaciencia cada 3.5 s
    const pauseCycle = time % 3.5;
    if (pauseCycle < 0.25) {
      cupBounce = Math.sin((pauseCycle / 0.25) * Math.PI) * 0.025;
      targetCupTilt = -0.08;
    } else {
      targetCupTilt = 0.0;
    }
  }

  // ==========================================
  // --- GESTOS DEL GUION (acciones de guion.json) ---
  // Se aplican encima de la actuación automática mientras dura cada acción.
  // ==========================================
  for (const a of timeline.acciones) {
    if (time < a.start || time >= a.end) continue;
    const p = (time - a.start) / (a.end - a.start);   // progreso 0 -> 1
    const f = a.fuerza ?? 1;

    if (a.quien === "Samario") {
      switch (a.gesto) {
        case "asentir":      targetSamarioX += Math.sin(p * Math.PI * 4) * 0.07 * f; break;
        case "negar":        targetSamarioY += Math.sin(p * Math.PI * 4) * 0.12 * f; break;
        case "mirar_taza":   targetSamarioY = 0.26; break;
        case "mirar_frente": targetSamarioY = 0.0; break;
        case "gesticular":   targetArm = 0.35 + Math.sin(p * Math.PI * 4) * 0.08 * f; break;
      }
    } else if (a.quien === "Tostadito") {
      switch (a.gesto) {
        case "saltar":         cupBounce += Math.sin(p * Math.PI) * 0.07 * f; break;
        case "ladear":         targetCupTilt = -0.18 * f; break;
        case "temblar":        cupBounce += Math.sin(time * 50) * 0.006 * f; break;
        case "mirar_samario":  targetCupY = -0.28; break;
        case "mirar_frente":   targetCupY = 0.0; break;
      }
    }
  }

  // Interpolación suave y aplicación
  currentSamarioHeadY += (targetSamarioY - currentSamarioHeadY) * 0.09;
  currentSamarioHeadX += (targetSamarioX - currentSamarioHeadX) * 0.09;
  currentSamarioArm   += (targetArm - currentSamarioArm) * 0.09;

  const breath = Math.sin(time * 2.0) * 0.003;   // Respiración viva en el torso
  samario.setHeadAngles(currentSamarioHeadY, currentSamarioHeadX, breath);
  if (samario.setArmGesture) samario.setArmGesture(currentSamarioArm);

  currentCupRotY += (targetCupY - currentCupRotY) * 0.10;
  currentCupTiltZ += (targetCupTilt - currentCupTiltZ) * 0.08;

  tostadito.setBounce(cupBounce);
  if (tostadito.setOrientation) {
    tostadito.setOrientation(currentCupRotY, currentCupTiltZ);
  }

  // Cámara: plano vigente según el guion
  return getShotAt(time);
}
