// Função da Vercel que atende /api/*. O código fica em apps/api/src/vercel.ts (testado com o resto
// da API); aqui só se reexporta a versão compilada, que o "npm run build" gera antes do deploy.
export { default } from "../apps/api/dist/vercel.js";
