import type { ReactNode } from "react";

import { SoundToggle } from "../features/sound/SoundToggle.tsx";
import { ThemeToggle } from "../features/theme/ThemeToggle.tsx";
import { WalletBalance } from "../features/wallet/WalletBalance.tsx";
import type { Route } from "./useHashRoute.ts";

const TABS: Array<{ hash: string; label: string; isCurrent: (route: Route) => boolean }> = [
  { hash: "#vitrine", label: "Vitrine", isCurrent: (route) => route.name === "vitrine" },
  {
    hash: "#quizzes",
    label: "Quizzes",
    isCurrent: (route) => route.name === "quizzes" || route.name === "quiz",
  },
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
  return (
    <header className="topbar">
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
            <SoundToggle />
            <ThemeToggle />
            {actions}
            <WalletBalance />
          </div>
        </div>
      </div>
    </header>
  );
}
