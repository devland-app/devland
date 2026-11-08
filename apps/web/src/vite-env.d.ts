/// <reference types="vite/client" />

// Variáveis VITE_ entram no bundle do navegador: são públicas. Tipadas aqui para não virarem "any".
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // "false" desliga as animações da vitrine (shared/flags.ts).
  readonly VITE_FLAG_SHOWCASE_ANIMATIONS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
