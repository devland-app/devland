import { useEffect } from "react";

import { useSound } from "../shared/sound/soundContext.ts";

// Links com cara de botão de massinha (as abas e os .btn que são <a>) afundam ao apertar; o som de
// botão completa a sensação. Um ouvinte só, na página inteira: link novo já nasce com som.
const PRESSABLE_LINKS = "a.btn, .tabs a";

export function PressSound() {
  const { play } = useSound();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest(PRESSABLE_LINKS)) {
        play("press");
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [play]);

  return null;
}
