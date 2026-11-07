// Formato único dos erros de negócio da API: { "message": "..." }. Os módulos usam este schema para
// que toda resposta de erro tenha a mesma forma no contrato e o front trate todas do mesmo jeito.
export const errorResponseSchema = {
  type: "object",
  required: ["message"],
  properties: {
    message: { type: "string", description: "Explicação do erro, pronta para mostrar na tela" },
  },
} as const;
