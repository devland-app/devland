import type { ReactNode } from "react";

import { ThemeToggle } from "../features/theme/ThemeToggle.tsx";
import { useBannerDismissed } from "./useBannerDismissed.ts";
import type { Route } from "./useHashRoute.ts";

const TABS: Array<{ route: Route; label: string }> = [
  { route: "vitrine", label: "Vitrine" },
  { route: "pedidos", label: "Meus pedidos" },
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
            <strong>Loja de brincadeira.</strong> Nada aqui é vendido de verdade e nenhum valor é
            cobrado.
          </p>
          <button
            className="banner-close"
            type="button"
            onClick={banner.dismiss}
            aria-label="Fechar aviso de loja de brincadeira"
          >
            ×
          </button>
        </div>
      )}
      <div className="nav-band gutter">
        <div className="wrap nav-row">
          <a className="logo" href="#vitrine" aria-label="DevZoo, ir para a vitrine">
            <img src="/favicon.svg" alt="" width={46} height={46} />
            DevZoo
          </a>
          <nav className="tabs" aria-label="Seções da loja">
            {TABS.map((tab) => (
              <a
                key={tab.route}
                href={`#${tab.route}`}
                aria-current={route === tab.route ? "page" : undefined}
              >
                {tab.label}
              </a>
            ))}
          </nav>
          <div className="actions">
            <ThemeToggle />
            {actions}
          </div>
        </div>
      </div>
    </header>
  );
}
