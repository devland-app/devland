import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface LockedPackage {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  os?: string[];
  cpu?: string[];
  libc?: string[];
}

const lock = JSON.parse(
  readFileSync(new URL("../../../../package-lock.json", import.meta.url), "utf8"),
) as { packages: Record<string, LockedPackage> };

// Mesma busca do Node: da pasta de quem importa, subindo até a raiz.
function resolve(name: string, from: string): string | undefined {
  let base = from;
  for (;;) {
    const candidate = base ? `${base}/node_modules/${name}` : `node_modules/${name}`;
    if (lock.packages[candidate]) return candidate;
    if (!base) return undefined;
    const parent = base.lastIndexOf("/node_modules/");
    base = parent >= 0 ? base.slice(0, parent) : "";
  }
}

function productionTree(): Map<string, LockedPackage> {
  const tree = new Map<string, LockedPackage>();
  const visit = (from: string, info: LockedPackage) => {
    for (const name of Object.keys({ ...info.dependencies, ...info.optionalDependencies })) {
      const path = resolve(name, from);
      const found = path ? lock.packages[path] : undefined;
      if (path && found && !tree.has(path)) {
        tree.set(path, found);
        visit(path, found);
      }
    }
  };
  visit("apps/api", lock.packages["apps/api"] as LockedPackage);
  return tree;
}

// A imagem ARM é montada numa máquina x64 com as dependências instaladas lá, fora do emulador (o
// Node quebra no QEMU). Isso só funciona se elas forem JavaScript: um pacote com binário por
// plataforma entraria com o binário errado, e a API quebraria só na imagem ARM.
describe("dependências de produção da API", () => {
  it("não têm binário específico de plataforma", () => {
    const tree = productionTree();
    expect(tree.size).toBeGreaterThan(100);
    const platformSpecific = [...tree]
      .filter(([, info]) => info.os || info.cpu || info.libc)
      .map(([path]) => path);
    expect(platformSpecific).toEqual([]);
  });
});
