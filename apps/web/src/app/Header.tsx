import { useEffect, useState, type ReactNode } from "react";

import { WalletBalance } from "../features/wallet/WalletBalance.tsx";
import { SettingsMenu } from "./SettingsMenu.tsx";
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
    label: "Mascotes",
    // A página de um mascote também pertence à aba da coleção.
    isCurrent: (route) => route.name === "mascotes" || route.name === "mascote",
  },
];

interface HeaderProps {
  route: Route;
  // Ações extras à direita (ex.: botão do carrinho).
  actions?: ReactNode;
}

const SCROLL_THRESHOLD_PX = 8;

// No celular só a linha do logo fica fixa: rolando a página, as abas saem do caminho (shell.css).
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(() => window.scrollY > SCROLL_THRESHOLD_PX);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrolled;
}

export function Header({ route, actions }: HeaderProps) {
  const scrolled = useScrolled();

  return (
    <header className={scrolled ? "topbar is-scrolled" : "topbar"}>
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
            <SettingsMenu aboutIsCurrent={route.name === "sobre"} />
            {actions}
            <WalletBalance />
          </div>
        </div>
      </div>
    </header>
  );
}
