// Produto como o resto da aplicação enxerga: camelCase e preço em centavos.
export interface Product {
  id: number;
  slug: string;
  name: string;
  concept: string;
  description: string;
  priceCents: number;
  stock: number;
}
