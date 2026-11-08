import type { Migration } from "../../shared/database.js";
import { MASCOT_LESSONS } from "./catalog.lessons.js";

// O módulo de catálogo é dono da tabela "products": nenhum outro módulo lê ou escreve nela direto.
// Os nomes levam o prefixo do módulo para não colidir com as migrations de orders e payments.
const createProducts: Migration = {
  name: "catalog_001_create_products",
  async up(db) {
    await db.schema.createTable("products", (table) => {
      table.increments("id").primary();
      table.string("slug", 80).notNullable().unique();
      table.string("name", 120).notNullable();
      // Conceito de DevOps que inspirou o mascote (ex.: "Contêineres", "CI/CD").
      table.string("concept", 60).notNullable();
      table.text("description").notNullable();
      // Dinheiro sempre em centavos: inteiros não têm erro de arredondamento.
      table.integer("price_cents").notNullable();
      table.integer("stock").notNullable().defaultTo(0);
      table.timestamps(true, true);

      // As regras ficam também no banco: nem um bug na API grava preço zero ou estoque negativo.
      table.check("?? > 0", ["price_cents"], "products_price_cents_positive");
      table.check("?? >= 0", ["stock"], "products_stock_not_negative");
    });
  },
  async down(db) {
    await db.schema.dropTable("products");
  },
};

// O catálogo inicial é dado de referência, não dado de teste: entra por migration para existir em
// todo ambiente (Docker local, Neon) sem um passo manual de seed.
const initialProducts = [
  {
    slug: "caranguejo-dos-conteineres",
    name: "Caranguejo dos Contêineres",
    concept: "Contêineres",
    description: "Carrega todas as dependências na carapaça e roda igualzinho em qualquer praia.",
    price_cents: 4990,
    stock: 25,
  },
  {
    slug: "lesminha-do-pipeline",
    name: "Lesminha do Pipeline",
    concept: "CI/CD",
    description: "Devagar e sempre: cada etapa só começa quando a anterior fica verde.",
    price_cents: 3990,
    stock: 40,
  },
  {
    slug: "corujinha-das-branches",
    name: "Corujinha das Branches",
    concept: "Controle de versão",
    description: "Vigia cada galho da árvore e pia antes que um conflito de merge aconteça.",
    price_cents: 4490,
    stock: 30,
  },
  {
    slug: "polvo-orquestrador",
    name: "Polvo Orquestrador",
    concept: "Orquestração",
    description: "Oito braços para escalar réplicas sem deixar nenhuma cair.",
    price_cents: 6990,
    stock: 15,
  },
  {
    slug: "tartaruga-do-rollback",
    name: "Tartaruga do Rollback",
    concept: "Deploy",
    description: "Quando algo dá errado, volta com calma para a última versão que funcionava.",
    price_cents: 3490,
    stock: 50,
  },
  {
    slug: "abelha-dos-logs",
    name: "Abelha dos Logs",
    concept: "Observabilidade",
    description: "Registra cada voo em JSON estruturado, sem perder nenhum zumbido.",
    price_cents: 2990,
    stock: 60,
  },
  {
    slug: "castor-do-cache",
    name: "Castor do Cache",
    concept: "Desempenho",
    description: "Guarda as respostas mais pedidas bem perto da porta da toca.",
    price_cents: 4290,
    stock: 20,
  },
  {
    slug: "raposa-dos-segredos",
    name: "Raposa dos Segredos",
    concept: "Segurança",
    description: "Nunca deixa uma senha no código: esconde tudo no cofre.",
    price_cents: 5490,
    stock: 10,
  },
];

const insertInitialProducts: Migration = {
  name: "catalog_002_insert_initial_products",
  async up(db) {
    await db("products").insert(initialProducts);
  },
  async down(db) {
    await db("products")
      .whereIn(
        "slug",
        initialProducts.map((product) => product.slug),
      )
      .delete();
  },
};

const addProductImages: Migration = {
  name: "catalog_003_add_product_images",
  async up(db) {
    // Coluna criada aceitando nulo, preenchida e só então marcada como obrigatória: assim a
    // migration funciona também num banco que já tem produtos.
    await db.schema.alterTable("products", (table) => {
      table.string("image_path", 160);
    });
    // O prefixo fica escrito aqui, e não importado de catalog.images.ts: uma migration já aplicada
    // não pode mudar de comportamento se a constante mudar no futuro.
    await db("products").update({
      image_path: db.raw("? || slug || ?", ["/images/mascots/", ".svg"]),
    });
    await db.schema.alterTable("products", (table) => {
      table.string("image_path", 160).notNullable().alter();
    });
  },
  async down(db) {
    await db.schema.alterTable("products", (table) => {
      table.dropColumn("image_path");
    });
  },
};

// Com um mascote de cada por pessoa, um estoque global pequeno impediria outras pessoas de completar
// a coleção. O estoque continua existindo (e sendo baixado com segurança no pagamento), só maior.
const INITIAL_STOCK: Record<string, number> = {
  "caranguejo-dos-conteineres": 25,
  "lesminha-do-pipeline": 40,
  "corujinha-das-branches": 30,
  "polvo-orquestrador": 15,
  "tartaruga-do-rollback": 50,
  "abelha-dos-logs": 60,
  "castor-do-cache": 20,
  "raposa-dos-segredos": 10,
};

const raiseStockForCollections: Migration = {
  name: "catalog_004_raise_stock_for_collections",
  async up(db) {
    await db("products").update({ stock: db.raw("greatest(stock, 1000)") });
  },
  async down(db) {
    for (const [slug, stock] of Object.entries(INITIAL_STOCK)) {
      await db("products").where({ slug }).update({ stock });
    }
  },
};

// Os textos vêm de catalog.lessons.ts. Esta migration grava a versão atual deles; para mudar um
// texto depois de aplicada, crie uma migration nova (uma migration já aplicada não roda de novo).
const addMascotLessons: Migration = {
  name: "catalog_005_add_mascot_lessons",
  async up(db) {
    await db.schema.alterTable("products", (table) => {
      table.text("lesson_explanation");
      table.text("lesson_real_world");
      table.text("lesson_in_devzoo");
    });
    for (const [slug, lesson] of Object.entries(MASCOT_LESSONS)) {
      await db("products").where({ slug }).update({
        lesson_explanation: lesson.explanation,
        lesson_real_world: lesson.realWorld,
        lesson_in_devzoo: lesson.inProject,
      });
    }
    // Produto sem texto (criado fora do catálogo inicial) recebe um aviso em vez de ficar nulo.
    await db("products").whereNull("lesson_explanation").update({
      lesson_explanation: "Este mascote ainda está preparando a aula dele.",
      lesson_real_world: "Em breve.",
      lesson_in_devzoo: "Em breve.",
    });
    await db.schema.alterTable("products", (table) => {
      table.text("lesson_explanation").notNullable().alter();
      table.text("lesson_real_world").notNullable().alter();
      table.text("lesson_in_devzoo").notNullable().alter();
    });
  },
  async down(db) {
    await db.schema.alterTable("products", (table) => {
      table.dropColumns("lesson_explanation", "lesson_real_world", "lesson_in_devzoo");
    });
  },
};

// Descrições mais diretas: cada uma diz em uma frase o que o conceito do mascote resolve.
const PLAIN_DESCRIPTIONS: Record<string, { before: string; after: string }> = {
  "caranguejo-dos-conteineres": {
    before: "Carrega todas as dependências na carapaça e roda igualzinho em qualquer praia.",
    after: "Empacota a aplicação com tudo de que ela precisa para rodar igual em qualquer lugar.",
  },
  "lesminha-do-pipeline": {
    before: "Devagar e sempre: cada etapa só começa quando a anterior fica verde.",
    after: "Leva cada mudança por etapas automáticas de verificação até a publicação.",
  },
  "corujinha-das-branches": {
    before: "Vigia cada galho da árvore e pia antes que um conflito de merge aconteça.",
    after: "Guarda o histórico do código e organiza o trabalho em branches paralelas.",
  },
  "polvo-orquestrador": {
    before: "Oito braços para escalar réplicas sem deixar nenhuma cair.",
    after: "Coordena vários serviços para que subam na ordem certa e funcionem juntos.",
  },
  "tartaruga-do-rollback": {
    before: "Quando algo dá errado, volta com calma para a última versão que funcionava.",
    after: "Publica versões novas e, se algo der errado, volta para a última versão estável.",
  },
  "abelha-dos-logs": {
    before: "Registra cada voo em JSON estruturado, sem perder nenhum zumbido.",
    after: "Registra o que acontece no sistema para que os erros possam ser investigados.",
  },
  "castor-do-cache": {
    before: "Guarda as respostas mais pedidas bem perto da porta da toca.",
    after: "Guarda respostas prontas para que o sistema responda mais rápido.",
  },
  "raposa-dos-segredos": {
    before: "Nunca deixa uma senha no código: esconde tudo no cofre.",
    after: "Mantém senhas, tokens e chaves fora do código.",
  },
};

const rewriteDescriptions: Migration = {
  name: "catalog_006_rewrite_descriptions",
  async up(db) {
    for (const [slug, text] of Object.entries(PLAIN_DESCRIPTIONS)) {
      await db("products").where({ slug }).update({ description: text.after });
    }
  },
  async down(db) {
    for (const [slug, text] of Object.entries(PLAIN_DESCRIPTIONS)) {
      await db("products").where({ slug }).update({ description: text.before });
    }
  },
};

// A loja passou a se chamar DevLand. A coluna ganha um nome neutro (não depende mais da marca) e
// os textos já gravados trocam o nome antigo pelo novo.
const LESSON_TEXT_COLUMNS = [
  "description",
  "lesson_explanation",
  "lesson_real_world",
  "lesson_in_project",
];

const renameToDevLand: Migration = {
  name: "catalog_007_rename_to_devland",
  async up(db) {
    await db.schema.alterTable("products", (table) => {
      table.renameColumn("lesson_in_devzoo", "lesson_in_project");
    });
    for (const column of LESSON_TEXT_COLUMNS) {
      await db("products").update({
        [column]: db.raw("replace(??, 'DevZoo', 'DevLand')", [column]),
      });
    }
  },
  async down(db) {
    for (const column of LESSON_TEXT_COLUMNS) {
      await db("products").update({
        [column]: db.raw("replace(??, 'DevLand', 'DevZoo')", [column]),
      });
    }
    await db.schema.alterTable("products", (table) => {
      table.renameColumn("lesson_in_project", "lesson_in_devzoo");
    });
  },
};

// Os mascotes passam a custar moedas virtuais, ganhas nos quizzes, em vez de reais simulados. Um
// acerto vale 20 moedas: um quiz perfeito (5 perguntas) paga quase um mascote.
const COIN_PRICES: Record<string, number> = {
  "caranguejo-dos-conteineres": 120,
  "lesminha-do-pipeline": 100,
  "corujinha-das-branches": 80,
  "polvo-orquestrador": 150,
  "tartaruga-do-rollback": 100,
  "abelha-dos-logs": 80,
  "castor-do-cache": 90,
  "raposa-dos-segredos": 110,
};

const priceInCoins: Migration = {
  name: "catalog_008_price_in_coins",
  async up(db) {
    await db.schema.alterTable("products", (table) => {
      table.integer("price_coins");
    });
    // Produto fora da lista (criado depois do catálogo inicial): uma moeda por real, arredondado.
    await db("products").update({ price_coins: db.raw("greatest(1, round(price_cents / 100.0))") });
    for (const [slug, price] of Object.entries(COIN_PRICES)) {
      await db("products").where({ slug }).update({ price_coins: price });
    }
    await db.schema.alterTable("products", (table) => {
      table.integer("price_coins").notNullable().alter();
      // A restrição de preço positivo em centavos sai junto com a coluna.
      table.dropColumn("price_cents");
    });
    // CHECK em SQL direto: dentro de um alterTable, o table.check do Knex monta a query errada.
    await db.raw(
      "alter table products add constraint products_price_coins_positive check (price_coins > 0)",
    );
  },
  async down(db) {
    await db.schema.alterTable("products", (table) => {
      table.integer("price_cents");
    });
    await db("products").update({ price_cents: db.raw("price_coins * 100") });
    for (const product of initialProducts) {
      await db("products")
        .where({ slug: product.slug })
        .update({ price_cents: product.price_cents });
    }
    await db.schema.alterTable("products", (table) => {
      table.integer("price_cents").notNullable().alter();
      table.dropColumn("price_coins");
    });
    await db.raw(
      "alter table products add constraint products_price_cents_positive check (price_cents > 0)",
    );
  },
};

// O nono conceito, infraestrutura como código. O quiz dele (mesmo slug) passa a pagar o preço
// deste mascote, e a economia continua fechando: acertar tudo paga a coleção inteira.
const INFRASTRUCTURE_SLUG = "joao-de-barro-da-infraestrutura";

const addInfrastructureMascot: Migration = {
  name: "catalog_009_add_infrastructure_mascot",
  async up(db) {
    const lesson = MASCOT_LESSONS[INFRASTRUCTURE_SLUG];
    if (lesson === undefined) {
      throw new Error(`Lição do mascote ${INFRASTRUCTURE_SLUG} não encontrada`);
    }
    await db("products").insert({
      slug: INFRASTRUCTURE_SLUG,
      name: "João-de-barro da Infraestrutura",
      concept: "Infraestrutura como código",
      description:
        "Descreve servidores e bancos em código para criar tudo igual, quantas vezes precisar.",
      price_coins: 100,
      stock: 1000,
      image_path: `/images/mascots/${INFRASTRUCTURE_SLUG}.svg`,
      lesson_explanation: lesson.explanation,
      lesson_real_world: lesson.realWorld,
      lesson_in_project: lesson.inProject,
    });
  },
  async down(db) {
    // Pedidos que já adotaram o mascote guardam nome e preço copiados: o histórico continua inteiro.
    await db("products").where({ slug: INFRASTRUCTURE_SLUG }).delete();
  },
};

export const catalogMigrations: Migration[] = [
  createProducts,
  insertInitialProducts,
  addProductImages,
  raiseStockForCollections,
  addMascotLessons,
  rewriteDescriptions,
  renameToDevLand,
  priceInCoins,
  addInfrastructureMascot,
];
