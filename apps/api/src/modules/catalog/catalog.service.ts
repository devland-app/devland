import type { Transaction } from "../../shared/database.js";
import { versionedImageUrl } from "./catalog.images.js";
import type { ProductRepository } from "./catalog.repository.js";
import type { Product } from "./catalog.types.js";

export class OutOfStockError extends Error {
  readonly productId: number;

  constructor(productId: number) {
    super(`Estoque insuficiente para o produto ${productId}`);
    this.name = "OutOfStockError";
    this.productId = productId;
  }
}

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

  async listProducts(): Promise<Product[]> {
    return (await this.products.list()).map(withVersionedImage);
  }

  async getProduct(id: number): Promise<Product> {
    const product = await this.products.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return withVersionedImage(product);
  }

  // Usado por outros módulos (ex.: pedidos) para saber nome, preço e estoque atuais. IDs que não
  // existem simplesmente não aparecem no resultado; quem chama decide o que fazer com a ausência.
  getProductsByIds(ids: number[]): Promise<Product[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.products.findByIds(ids);
  }

  // Baixa o estoque de vários produtos dentro da transação de quem coordena a compra: se faltar
  // qualquer um, a transação inteira é desfeita. A ordem crescente de ID faz duas compras
  // simultâneas travarem as linhas sempre na mesma sequência, o que evita deadlock.
  async reserveStock(
    items: Array<{ productId: number; quantity: number }>,
    trx: Transaction,
  ): Promise<void> {
    const ordered = [...items].sort((a, b) => a.productId - b.productId);
    for (const item of ordered) {
      const reserved = await this.products.decrementStock(item.productId, item.quantity, trx);
      if (!reserved) {
        throw new OutOfStockError(item.productId);
      }
    }
  }
}

function withVersionedImage(product: Product): Product {
  return { ...product, imageUrl: versionedImageUrl(product.imageUrl) };
}
