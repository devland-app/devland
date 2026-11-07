import type { Database, Transaction } from "../../shared/database.js";
import type { Product } from "./catalog.types.js";

// O service depende só desta interface (padrão Repository). Assim, o acesso a dados pode mudar,
// e os testes unitários usam uma implementação em memória, sem banco.
export interface ProductRepository {
  list(): Promise<Product[]>;
  findById(id: number): Promise<Product | undefined>;
  findByIds(ids: number[]): Promise<Product[]>;
  decrementStock(productId: number, quantity: number, trx: Transaction): Promise<boolean>;
}

// Formato da linha no banco (snake_case). Fica restrito a este arquivo: o resto do módulo só vê Product.
interface ProductRow {
  id: number;
  slug: string;
  name: string;
  concept: string;
  description: string;
  price_coins: number;
  stock: number;
  image_path: string;
  lesson_explanation: string;
  lesson_real_world: string;
  lesson_in_project: string;
}

// Colunas explícitas em vez de "select *": a resposta não muda sozinha quando a tabela ganha colunas.
const PRODUCT_COLUMNS = [
  "id",
  "slug",
  "name",
  "concept",
  "description",
  "price_coins",
  "stock",
  "image_path",
  "lesson_explanation",
  "lesson_real_world",
  "lesson_in_project",
] as const;

export class KnexProductRepository implements ProductRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async list(): Promise<Product[]> {
    const rows = await this.db<ProductRow>("products")
      .select(...PRODUCT_COLUMNS)
      .orderBy("id");
    return rows.map(toProduct);
  }

  async findById(id: number): Promise<Product | undefined> {
    const row = await this.db<ProductRow>("products")
      .select(...PRODUCT_COLUMNS)
      .where({ id })
      .first();
    return row ? toProduct(row) : undefined;
  }

  async findByIds(ids: number[]): Promise<Product[]> {
    const rows = await this.db<ProductRow>("products")
      .select(...PRODUCT_COLUMNS)
      .whereIn("id", ids)
      .orderBy("id");
    return rows.map(toProduct);
  }

  // Atualização condicional: o próprio banco confere "stock >= quantity" na linha que vai mudar,
  // então duas compras simultâneas da última unidade não deixam o estoque negativo.
  async decrementStock(productId: number, quantity: number, trx: Transaction): Promise<boolean> {
    const updated = await trx<ProductRow>("products")
      .where({ id: productId })
      .andWhere("stock", ">=", quantity)
      .decrement("stock", quantity);
    return updated === 1;
  }
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    concept: row.concept,
    description: row.description,
    priceCoins: row.price_coins,
    stock: row.stock,
    imageUrl: row.image_path,
    lesson: {
      explanation: row.lesson_explanation,
      realWorld: row.lesson_real_world,
      inProject: row.lesson_in_project,
    },
  };
}
