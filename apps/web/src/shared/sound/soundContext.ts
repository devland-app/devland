import { createContext, useContext } from "react";

import type { SoundName } from "./synth.ts";

export interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  // Não faz nada com o som desligado: quem chama não precisa conferir.
  play: (name: SoundName) => void;
}

export const SoundContext = createContext<SoundContextValue | null>(null);

export function useSound(): SoundContextValue {
  const sound = useContext(SoundContext);
  if (!sound) {
    throw new Error("useSound precisa estar dentro de <SoundProvider>");
  }
  return sound;
}
