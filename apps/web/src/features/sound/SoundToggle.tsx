import { useSound } from "../../shared/sound/soundContext.ts";

export function SoundToggle() {
  const { enabled, toggle } = useSound();

  return (
    <button
      className="btn btn--soft"
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Som ligado. Desligar som" : "Som desligado. Ligar som"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" />
        {enabled ? (
          <path d="M15.5 9a4 4 0 0 1 0 6M18.2 6.5a7.5 7.5 0 0 1 0 11" />
        ) : (
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        )}
      </svg>
      {enabled ? "Som ligado" : "Som desligado"}
    </button>
  );
}
