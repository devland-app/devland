// Efeitos sonoros sintetizados na hora com a Web Audio API: sem arquivos de áudio para baixar ou
// licenciar. Cada som é a soma de notas curtas com subida/descida de volume suave (sem estalo).

export type SoundName =
  "pop" | "unpop" | "jump" | "wiggle" | "spin" | "giggle" | "trick" | "press" | "chime" | "coin";

let context: AudioContext | null = null;

// O navegador só libera áudio depois de um gesto da pessoa (clique); por isso o contexto é criado
// na primeira vez que um som toca, sempre dentro de um clique.
function audio(): AudioContext {
  context ??= new AudioContext();
  if (context.state === "suspended") {
    void context.resume();
  }
  return context;
}

interface Note {
  frequency: number;
  // Frequência final, para notas que sobem ou descem (glissando).
  to?: number;
  duration: number;
  delay?: number;
  type?: OscillatorType;
  volume?: number;
}

function play(notes: Note[]): void {
  const ctx = audio();
  for (const note of notes) {
    const start = ctx.currentTime + (note.delay ?? 0);
    const end = start + note.duration;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = note.type ?? "sine";
    oscillator.frequency.setValueAtTime(note.frequency, start);
    if (note.to) {
      oscillator.frequency.exponentialRampToValueAtTime(note.to, end);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(note.volume ?? 0.15, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }
}

const SOUNDS: Record<SoundName, Note[]> = {
  pop: [{ frequency: 520, to: 880, duration: 0.09 }],
  unpop: [{ frequency: 700, to: 380, duration: 0.1, volume: 0.12 }],
  jump: [
    { frequency: 260, to: 640, duration: 0.18, volume: 0.18 },
    { frequency: 640, to: 320, duration: 0.22, delay: 0.2, volume: 0.1 },
  ],
  wiggle: [0, 0.07, 0.14, 0.21].map((delay, index) => ({
    frequency: index % 2 === 0 ? 460 : 560,
    duration: 0.06,
    delay,
    type: "triangle" as const,
    volume: 0.11,
  })),
  spin: [{ frequency: 300, to: 1100, duration: 0.38, type: "triangle", volume: 0.1 }],
  giggle: [0, 0.09, 0.18].map((delay, index) => ({
    frequency: 700 + index * 120,
    to: 880 + index * 120,
    duration: 0.07,
    delay,
    volume: 0.12,
  })),
  // O truque do mascote: duas notas rápidas e uma que sobe, como um "tcharam".
  trick: [
    { frequency: 392, duration: 0.07, type: "triangle", volume: 0.1 },
    { frequency: 523.25, duration: 0.07, delay: 0.08, type: "triangle", volume: 0.1 },
    { frequency: 659.25, to: 988, duration: 0.22, delay: 0.16, type: "triangle", volume: 0.1 },
  ],
  // Botão de massinha afundando: um estalinho e um "toc" grave e curto.
  press: [
    { frequency: 1400, to: 900, duration: 0.012, type: "square", volume: 0.02 },
    { frequency: 230, to: 140, duration: 0.07, type: "triangle", volume: 0.16 },
  ],
  // Duas notas agudas e rápidas, a segunda mais longa: o "plim" de pegar uma moeda.
  coin: [
    { frequency: 987.77, duration: 0.08, type: "square", volume: 0.06 },
    { frequency: 1318.51, duration: 0.28, delay: 0.07, type: "square", volume: 0.06 },
  ],
  // Dó, mi, sol e dó: um acorde maior em arpejo para a compra aprovada.
  chime: [523.25, 659.25, 783.99, 1046.5].map((frequency, index) => ({
    frequency,
    duration: 0.4,
    delay: index * 0.09,
    volume: 0.12,
  })),
};

export function playSound(name: SoundName): void {
  try {
    play(SOUNDS[name]);
  } catch {
    // Navegador sem Web Audio: a loja segue funcionando, só sem som.
  }
}
