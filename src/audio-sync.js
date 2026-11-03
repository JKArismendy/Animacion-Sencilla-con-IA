// 1. LISTA OFICIAL Y ORDENADA DE DIÁLOGOS
// Pon aquí las rutas exactas de los audios en el orden del episodio
export const dialogueTracks = [
  { file: 'audio/lucas_1.mp3',     speaker: 'Lucas',     shot: 'WIDE' },
  { file: 'audio/tostadito_1.mp3', speaker: 'Tostadito', shot: 'CUP' },
  { file: 'audio/lucas_2.mp3',     speaker: 'Lucas',     shot: 'LUCAS' },
  { file: 'audio/tostadito_2.mp3', speaker: 'Tostadito', shot: 'CUP' },
  { file: 'audio/lucas_3.mp3',     speaker: 'Lucas',     shot: 'LUCAS' },
  { file: 'audio/lucas_4.mp3',     speaker: 'Lucas',     shot: 'WIDE' },
  { file: 'audio/tostadito_3.mp3', speaker: 'Tostadito', shot: 'WIDE' }
];

// Fallback preventivo con tiempos medidos si aún no cargan los metadatos
let timeline = [
  { start: 0.0,  end: 3.8,  speaker: "Lucas",     shot: "WIDE" },
  { start: 3.8,  end: 11.2, speaker: "Tostadito", shot: "CUP" },
  { start: 11.2, end: 18.2, speaker: "Lucas",     shot: "LUCAS" },
  { start: 18.2, end: 24.5, speaker: "Tostadito", shot: "CUP" },
  { start: 24.5, end: 32.5, speaker: "Lucas",     shot: "LUCAS" },
  { start: 32.5, end: 36.5, speaker: "Lucas",     shot: "WIDE" },
  { start: 36.5, end: 45.0, speaker: "Tostadito", shot: "WIDE" }
];

// Medición automática al milisegundo por el navegador
export async function buildPreciseTimeline() {
  const calculated = [];
  let currentOffset = 0.0;

  for (const track of dialogueTracks) {
    try {
      const audio = new Audio(track.file);
      await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', resolve, { once: true });
        audio.addEventListener('error', resolve, { once: true });
      });
      const dur = audio.duration || 4.0;
      calculated.push({
        start: currentOffset,
        end: currentOffset + dur,
        speaker: track.speaker,
        shot: track.shot
      });
      currentOffset += dur;
    } catch {
      // Si falla algún archivo individual mantiene el fallback
    }
  }

  if (calculated.length === dialogueTracks.length) {
    timeline = calculated;
  }
}

// Ejecutar medición en segundo plano de inmediato
buildPreciseTimeline();

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
let currentLucasHeadY = 0;
let currentLucasHeadX = 0;
let currentLucasArm = 0;
let currentCupRotY = 0;
let currentCupTiltZ = 0;

export function updateActors(time, lucas, tostadito) {
  // Búsqueda estricta del diálogo activo
  const current = timeline.find(s => time >= s.start && time < s.end) || { speaker: "None", shot: "WIDE", start: time, end: time + 1 };
  const volume = getAudioVolume();
  const isSpeaking = volume > 0.02;

  const isLucasTurn = (current.speaker === "Lucas");
  const isCupTurn = (current.speaker === "Tostadito");

  // ==========================================
  // --- ACTUACIÓN DE LUCAS ---
  // ==========================================
  let targetLucasY = 0;
  let targetLucasX = 0;
  let targetArm = 0;

  if (isLucasTurn) {
    // HABLANDO: Mira a Tostadito (derecha), gesticula con el brazo
    targetLucasY = 0.22;
    targetLucasX = isSpeaking ? (Math.sin(time * 6) * 0.03) : 0;
    targetArm = 0.20 + (volume * 0.35);
    lucas.setJawOpen(volume * 0.12);
  } else {
    // ESCUCHANDO / PAUSA:
    lucas.setJawOpen(0);
    targetArm = 0.0; // Brazo descansando en la barra
    
    if (isCupTurn) {
      // Mirar atentamente a Tostadito con asentimientos suaves y orgánicos
      targetLucasY = 0.26;
      targetLucasX = 0.04 + (Math.sin(time * 3.2) * 0.035); // Asentimiento de aprobación
    } else {
      // Silencio general: mirada pensativa al frente
      targetLucasY = 0.0;
      targetLucasX = Math.sin(time * 1.5) * 0.02;
    }
  }

  // Interpolación suave
  currentLucasHeadY += (targetLucasY - currentLucasHeadY) * 0.09;
  currentLucasHeadX += (targetLucasX - currentLucasHeadX) * 0.09;
  currentLucasArm   += (targetArm - currentLucasArm) * 0.09;

  // Respiración viva en el torso
  const breath = Math.sin(time * 2.0) * 0.003;
  lucas.setHeadAngles(currentLucasHeadY, currentLucasHeadX, breath);
  if (lucas.setArmGesture) lucas.setArmGesture(currentLucasArm);

  // ==========================================
  // --- ACTUACIÓN DE TOSTADITO ---
  // ==========================================
  let targetCupY = 0;
  let targetCupTilt = 0;
  let cupBounce = 0;

  if (isCupTurn) {
    // HABLANDO: Girado hacia Lucas
    targetCupY = -0.28;
    tostadito.setMouthScale(1.0 + volume * 3.5);

    // Salto de énfasis enérgico al inicio de la frase (primeros 0.35 segundos)
    const lineTime = time - current.start;
    if (lineTime < 0.35) {
      cupBounce = Math.sin((lineTime / 0.35) * Math.PI) * 0.045;
    } else if (isSpeaking) {
      // Micro-vibración orgánica por la potencia de voz
      cupBounce = volume * 0.015;
    }
  } else {
    // ESCUCHANDO / PAUSA:
    tostadito.setMouthScale(1.0);
    targetCupY = 0.0;

    // Movimiento reactivo durante la pausa:
    // Pequeño ladeo de cabeza/taza curioso y saltito de impaciencia cada 3.5s
    const pauseCycle = time % 3.5;
    if (pauseCycle < 0.25) {
      cupBounce = Math.sin((pauseCycle / 0.25) * Math.PI) * 0.025; // Salto discreto
      targetCupTilt = -0.08; // Ladeo de atención
    } else {
      targetCupTilt = 0.0;
    }
  }

  currentCupRotY += (targetCupY - currentCupRotY) * 0.10;
  currentCupTiltZ += (targetCupTilt - currentCupTiltZ) * 0.08;

  tostadito.setBounce(cupBounce);
  if (tostadito.setOrientation) {
    tostadito.setOrientation(currentCupRotY, currentCupTiltZ);
  }

  return current.shot;
}