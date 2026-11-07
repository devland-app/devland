// Produto como o resto da aplicação enxerga: camelCase e preço em centavos.
export interface Product {
  id: number;
  slug: string;
  name: string;
  concept: string;
  description: string;
  priceCoins: number;
  stock: number;
  // Caminho da ilustração, relativo à URL da API (ex.: /images/mascots/<slug>.svg).
  imageUrl: string;
  // O conceito de DevOps que o mascote ensina, em linguagem simples.
  lesson: {
    explanation: string;
    realWorld: string;
    inProject: string;
  };
}
