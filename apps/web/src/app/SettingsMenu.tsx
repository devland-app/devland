import { useState } from "react";

import { SoundToggle } from "../features/sound/SoundToggle.tsx";
import { ThemeToggle } from "../features/theme/ThemeToggle.tsx";
import { Dialog } from "../shared/ui/Dialog.tsx";

interface SettingsMenuProps {
  aboutIsCurrent: boolean;
}

// Preferências e a página Sobre ficam aqui para o cabeçalho mostrar só o que se usa o tempo todo.
export function SettingsMenu({ aboutIsCurrent }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        className="btn btn--soft btn--icon"
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Configurações"
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3.4" />
          <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.4-2-1.6Z" />
        </svg>
      </button>
      <Dialog open={open} onClose={close} labelledBy="settings-title" variant="menu">
        <div className="panel-head">
          <h2 id="settings-title">Configurações</h2>
          <button
            className="btn btn--soft btn--icon"
            type="button"
            onClick={close}
            aria-label="Fechar configurações"
          >
            ×
          </button>
        </div>
        <div className="settings-options">
          <SoundToggle />
          <ThemeToggle />
          <a
            className="btn btn--soft"
            href="#sobre"
            onClick={close}
            aria-current={aboutIsCurrent ? "page" : undefined}
          >
            <span className="settings-glyph" aria-hidden="true">
              ?
            </span>
            Sobre a DevLand
          </a>
        </div>
      </Dialog>
    </>
  );
}
