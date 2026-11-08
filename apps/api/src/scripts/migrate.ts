import { migrations } from "../migrations.js";
import { createDatabase, runMigrations } from "../shared/database.js";

// Aplica as migrations pendentes num banco remoto. O CI roda este script antes de cada deploy na
// Vercel, onde a API não aplica migrations ao subir (cada instância da função subiria mais devagar).
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write("DATABASE_URL é obrigatória para aplicar as migrations.\n");
  process.exit(1);
}

const db = createDatabase(databaseUrl);
try {
  const applied = await runMigrations(db, migrations);
  process.stdout.write(
    applied.length > 0
      ? `Migrations aplicadas: ${applied.join(", ")}\n`
      : "Nenhuma migration pendente.\n",
  );
} finally {
  await db.destroy();
}
