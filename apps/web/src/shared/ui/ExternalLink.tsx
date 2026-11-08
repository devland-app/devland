import type { ReactNode } from "react";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

// Link para fora do site: abre em outra aba, e o leitor de tela fica sabendo.
export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
      <span className="sr-only"> (abre em outra aba)</span>
    </a>
  );
}
