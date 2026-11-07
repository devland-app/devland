import type { ProductRepository } from "./catalog.repository.js";
import type { Product } from "./catalog.types.js";

export class ProductNotFoundError extends Error {
  constructor(id: number) {
    super(`Produto ${id} não encontrado`);
    this.name = "ProductNotFoundError";
  }
}

// Regras de negócio do catálogo. Não conhece HTTP nem banco: recebe o repository pronto, então
// pode ser testado com uma implementação em memória.
export class CatalogService {
  private readonly products: ProductRepository;

  constructor(products: ProductRepository) {
    this.products = products;
  }

  listProducts(): Promise<Product[]> {
    return this.products.list();
  }

  async getProduct(id: number): Promise<Product> {
    const product = await this.products.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return product;
  }

  // Usado por outros módulos (ex.: pedidos) para saber nome, preço e estoque atuais. IDs que não
  // existem simplesmente não aparecem no resultado; quem chama decide o que fazer com a ausência.
  getProductsByIds(ids: number[]): Promise<Product[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.products.findByIds(ids);
  }
}
