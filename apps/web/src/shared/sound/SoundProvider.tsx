import { useMemo, useState, type ReactNode } from "react";

import { readStored, writeStored } from "../storage.ts";
import { SoundContext, type SoundContextValue } from "./soundContext.ts";
import { playSound } from "./synth.ts";

const STORAGE_KEY = "devland-sound";

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

// O som começa desligado: ninguém é surpreendido por barulho ao abrir a loja. Ligado, a escolha
// fica salva neste navegador.
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => readStored(STORAGE_KEY, isBoolean, false));

  const value = useMemo<SoundContextValue>(
    () => ({
      enabled,
      toggle() {
        const next = !enabled;
        setEnabled(next);
        writeStored(STORAGE_KEY, next);
        // Um "pop" confirma que o som foi ligado (e libera o áudio, que exige um clique).
        if (next) playSound("pop");
      },
      play(name) {
        if (enabled) playSound(name);
      },
    }),
    [enabled],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
