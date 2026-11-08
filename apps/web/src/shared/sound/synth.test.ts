import { afterEach, describe, expect, it, vi } from "vitest";

// O jsdom não tem Web Audio. Este dublê registra as notas tocadas.
class FakeAudioContext {
  static created = 0;
  static notes: number[] = [];
  state: AudioContextState = "suspended";
  currentTime = 0;
  destination = {};
  resumed = 0;

  constructor() {
    FakeAudioContext.created += 1;
  }
  resume() {
    this.resumed += 1;
    this.state = "running";
    return Promise.resolve();
  }
  createOscillator() {
    const frequency = {
      setValueAtTime: (value: number) => FakeAudioContext.notes.push(value),
      exponentialRampToValueAtTime: () => {},
    };
    return {
      type: "sine",
      frequency,
      connect: (node: unknown) => node,
      start: () => {},
      stop: () => {},
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: (node: unknown) => node,
    };
  }
}

describe("playSound", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    FakeAudioContext.created = 0;
    FakeAudioContext.notes = [];
  });

  it("toca as notas do som e reaproveita o mesmo contexto de áudio", async () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const { playSound } = await import("./synth.ts");
    playSound("coin");
    playSound("chime");
    expect(FakeAudioContext.created).toBe(1);
    // Moeda: duas notas agudas; acorde: dó, mi, sol e dó.
    expect(FakeAudioContext.notes).toEqual([987.77, 1318.51, 523.25, 659.25, 783.99, 1046.5]);
  });

  it("sem Web Audio no navegador, segue sem som e sem erro", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const { playSound } = await import("./synth.ts");
    expect(() => playSound("pop")).not.toThrow();
  });
});
