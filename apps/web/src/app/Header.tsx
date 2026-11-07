import type { ReactNode } from "react";

import { SoundToggle } from "../features/sound/SoundToggle.tsx";
import { ThemeToggle } from "../features/theme/ThemeToggle.tsx";
import { WalletBadge } from "../features/wallet/WalletBadge.tsx";
import { useBannerDismissed } from "./useBannerDismissed.ts";
import type { Route } from "./useHashRoute.ts";

const TABS: Array<{ hash: string; label: string; isCurrent: (route: Route) => boolean }> = [
  { hash: "#vitrine", label: "Vitrine", isCurrent: (route) => route.name === "vitrine" },
  {
    hash: "#mascotes",
    label: "Meus mascotes",
    // A página de um mascote também pertence à aba da coleção.
    isCurrent: (route) => route.name === "mascotes" || route.name === "mascote",
  },
];

interface HeaderProps {
  route: Route;
  // Ações extras à direita (ex.: botão do carrinho).
  actions?: ReactNode;
}

export function Header({ route, actions }: HeaderProps) {
  const banner = useBannerDismissed();

  return (
    <header className="topbar">
      {!banner.dismissed && (
        <div className="banner gutter" role="note">
          <p>
            <strong>Loja simulada.</strong> Nenhum produto é vendido e nenhum valor é cobrado.
          </p>
          <button
            className="banner-close"
            type="button"
            onClick={banner.dismiss}
            aria-label="Fechar aviso de loja simulada"
          >
            ×
          </button>
        </div>
      )}
      <div className="nav-band gutter">
        <div className="wrap nav-row">
          <a className="logo" href="#vitrine" aria-label="DevLand, ir para a vitrine">
            <img src="/favicon.svg" alt="" width={46} height={46} />
            <span className="logo-text">DevLand</span>
          </a>
          <nav className="tabs" aria-label="Seções da loja">
            {TABS.map((tab) => (
              <a
                key={tab.hash}
                href={tab.hash}
                aria-current={tab.isCurrent(route) ? "page" : undefined}
              >
                {tab.label}
              </a>
            ))}
          </nav>
          <div className="actions">
            <WalletBadge />
            <SoundToggle />
            <ThemeToggle />
            {actions}
          </div>
        </div>
      </div>
    </header>
  );
}
