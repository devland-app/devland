import type { Database } from "../../shared/database.js";
import type { Product } from "./catalog.types.js";

// O service depende só desta interface (padrão Repository). Assim, o acesso a dados pode mudar,
// e os testes unitários usam uma implementação em memória, sem banco.
export interface ProductRepository {
  list(): Promise<Product[]>;
  findById(id: number): Promise<Product | undefined>;
}

// Formato da linha no banco (snake_case). Fica restrito a este arquivo: o resto do módulo só vê Product.
interface ProductRow {
  id: number;
  slug: string;
  name: string;
  concept: string;
  description: string;
  price_cents: number;
  stock: number;
}

// Colunas explícitas em vez de "select *": a resposta não muda sozinha quando a tabela ganha colunas.
const PRODUCT_COLUMNS = [
  "id",
  "slug",
  "name",
  "concept",
  "description",
  "price_cents",
  "stock",
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
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    concept: row.concept,
    description: row.description,
    priceCents: row.price_cents,
    stock: row.stock,
  };
}
