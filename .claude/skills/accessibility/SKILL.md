---
name: accessibility
description: Checklist de acessibilidade (WCAG 2.2 AA) para criar ou revisar telas e componentes React do apps/web. Use ao escrever UI, revisar PRs de front ou quando pedirem para checar acessibilidade.
---

# Acessibilidade no DevZoo

Meta: WCAG 2.2 nível AA. A loja precisa ser usável só com teclado, com leitor de tela e com zoom de 200%.

## Ao escrever um componente

1. **HTML semântico primeiro.** `button` para ações, `a` para navegação, `main`, `nav`, `header`,
   `footer`, listas com `ul/li`. Nunca `div` com `onClick`.
2. **Todo elemento interativo tem nome acessível.** Botão só com ícone ou emoji recebe `aria-label`.
   Emojis decorativos ficam em `<span aria-hidden="true">`.
3. **Imagens e SVGs.** Mascote com significado: `role="img"` + `aria-label` (ou `<title>`).
   Decorativo: `aria-hidden="true"`.
4. **Formulários.** Cada `input` tem `<label>` associado. Erros são anunciados com `aria-describedby`
   e o texto do erro diz como corrigir.
5. **Foco.** Foco visível sempre (não remova `outline` sem substituto). Drawers e modais movem o foco
   para dentro ao abrir, prendem o foco enquanto abertos, fecham com `Esc` e devolvem o foco ao botão
   que os abriu. Conteúdo escondido fora da tela recebe `inert` ou `aria-hidden`.
6. **Mudanças dinâmicas.** Contador do carrinho, status do pedido e mensagens de erro usam
   `aria-live="polite"` (ou `role="status"` / `role="alert"` para erros).
7. **Cor e contraste.** Texto normal ≥ 4.5:1, texto grande e ícones ≥ 3:1. Não use só a cor para
   indicar estado (ex.: raridade tem texto, não só cor de fundo).
8. **Movimento.** Animações respeitam `prefers-reduced-motion: reduce`.
9. **Idioma e títulos.** `<html lang="pt-BR">`, um `h1` por página e hierarquia de títulos sem pular níveis.
10. **Alvos de toque** com pelo menos 24×24 px.

## Ao revisar

- Navegue a tela só com `Tab`, `Shift+Tab`, `Enter`, `Espaço` e `Esc`. Anote onde o foco some ou fica preso.
- Rode o Lighthouse (aba Accessibility) ou a extensão axe DevTools e corrija tudo que for "serious" ou "critical".
- Se houver testes, prefira queries por papel (`getByRole('button', { name: /adotar/i })`): elas falham
  quando a acessibilidade quebra.

Relate problemas com: componente, critério WCAG, impacto para o usuário e correção sugerida.
