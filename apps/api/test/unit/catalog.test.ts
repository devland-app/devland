import { describe, expect, it } from "vitest";

import { versionedImageUrl } from "../../src/modules/catalog/catalog.images.js";
import type { ProductRepository } from "../../src/modules/catalog/catalog.repository.js";
import {
  CatalogService,
  OutOfStockError,
  ProductNotFoundError,
} from "../../src/modules/catalog/catalog.service.js";
import type { Product } from "../../src/modules/catalog/catalog.types.js";
import { fakeTransaction } from "./fakes.js";

function product(id: number, stock: number): Product {
  return {
    id,
    slug: `mascote-${id}`,
    name: `Mascote ${id}`,
    concept: "Conceito",
    description: "Descrição",
    priceCoins: 100,
    stock,
    imageUrl: "/images/mascots/caranguejo-dos-conteineres.svg",
    lesson: { explanation: "a", realWorld: "b", inProject: "c" },
  };
}

class FakeProducts implements ProductRepository {
  readonly decremented: number[] = [];
  findByIdsCalls = 0;

  constructor(private readonly products: Product[]) {}

  async list() {
    return this.products;
  }
  async findById(id: number) {
    return this.products.find((item) => item.id === id);
  }
  async findByIds(ids: number[]) {
    this.findByIdsCalls += 1;
    return this.products.filter((item) => ids.includes(item.id));
  }
  async decrementStock(productId: number, quantity: number) {
    this.decremented.push(productId);
    const item = this.products.find((candidate) => candidate.id === productId);
    if (!item || item.stock < quantity) return false;
    item.stock -= quantity;
    return true;
  }
}

describe("CatalogService", () => {
  it("versiona o endereço das ilustrações na listagem e no detalhe", async () => {
    const service = new CatalogService(new FakeProducts([product(1, 5)]));
    const [listed] = await service.listProducts();
    expect(listed?.imageUrl).toMatch(/\?v=[0-9a-f]{8}$/);
    expect((await service.getProduct(1)).imageUrl).toBe(listed?.imageUrl);
  });

  it("avisa quando o produto não existe", async () => {
    const service = new CatalogService(new FakeProducts([]));
    await expect(service.getProduct(42)).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it("não consulta o banco para uma lista vazia de ids", async () => {
    const products = new FakeProducts([product(1, 5)]);
    expect(await new CatalogService(products).getProductsByIds([])).toEqual([]);
    expect(products.findByIdsCalls).toBe(0);
  });

  // Duas compras simultâneas travam as linhas sempre na mesma ordem: sem deadlock.
  it("baixa o estoque em ordem crescente de id", async () => {
    const products = new FakeProducts([product(3, 5), product(1, 5), product(2, 5)]);
    await new CatalogService(products).reserveStock(
      [
        { productId: 3, quantity: 1 },
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 1 },
      ],
      fakeTransaction,
    );
    expect(products.decremented).toEqual([1, 2, 3]);
  });

  it("para no primeiro produto sem estoque e diz qual foi", async () => {
    const products = new FakeProducts([product(1, 5), product(2, 0)]);
    const error = await new CatalogService(products)
      .reserveStock(
        [
          { productId: 2, quantity: 1 },
          { productId: 1, quantity: 1 },
        ],
        fakeTransaction,
      )
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(OutOfStockError);
    expect((error as OutOfStockError).productId).toBe(2);
  });
});

describe("versionedImageUrl", () => {
  it("devolve o mesmo endereço para um arquivo que não existe", () => {
    expect(versionedImageUrl("/images/mascots/unicornio.svg")).toBe(
      "/images/mascots/unicornio.svg",
    );
  });

  it("só olha o nome do arquivo: um caminho para fora da pasta não é lido", () => {
    expect(versionedImageUrl("/images/mascots/../../../package.json")).toBe(
      "/images/mascots/../../../package.json",
    );
  });

  it("mantém a mesma versão enquanto o arquivo não muda", () => {
    const path = "/images/mascots/castor-do-cache.svg";
    expect(versionedImageUrl(path)).toBe(versionedImageUrl(path));
  });
});
