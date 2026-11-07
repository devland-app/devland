/// <reference types="vite/client" />

// Variáveis VITE_ entram no bundle do navegador: são públicas. Tipadas aqui para não virarem "any".
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
