// Feature flags: ligam e desligam um comportamento sem mudar o código. São lidas no build (VITE_*),
// então valem para o ambiente em que o site foi construído e são públicas. Para desligar uma,
// defina a variável como "false" e publique de novo.
export const FLAGS = {
  // Animações de vez em quando na vitrine: o contêiner do caranguejo pula, os checks da lesminha
  // reaparecem, a corujinha pula no galho... Ligadas por padrão.
  showcaseAnimations: import.meta.env.VITE_FLAG_SHOWCASE_ANIMATIONS !== "false",
} as const;
