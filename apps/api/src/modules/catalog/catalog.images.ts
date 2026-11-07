import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";

export const MASCOT_IMAGES_PREFIX = "/images/mascots/";

// apps/api/static/mascots: o caminho relativo é o mesmo a partir de src/modules/catalog (dev) e de
// dist/modules/catalog (imagem Docker), que ficam três níveis abaixo de apps/api.
const MASCOT_IMAGES_DIR = fileURLToPath(new URL("../../../static/mascots", import.meta.url));

const imageVersions = new Map<string, string>();

// O endereço da imagem leva uma impressão digital do arquivo (?v=...). Quando o desenho muda, o
// endereço muda junto e o navegador baixa a versão nova, em vez de usar a cópia guardada em cache.
export function versionedImageUrl(imagePath: string): string {
  // basename: só o nome do arquivo, sem chance de apontar para fora da pasta das ilustrações.
  const fileName = basename(imagePath);
  let version = imageVersions.get(fileName);
  if (version === undefined) {
    try {
      const content = readFileSync(join(MASCOT_IMAGES_DIR, fileName));
      version = createHash("sha256").update(content).digest("hex").slice(0, 8);
    } catch {
      return imagePath;
    }
    imageVersions.set(fileName, version);
  }
  return `${imagePath}?v=${version}`;
}

// As ilustrações dos mascotes são arquivos estáticos do próprio módulo de catálogo.
export function registerMascotImages(app: FastifyInstance): void {
  void app.register(fastifyStatic, {
    root: MASCOT_IMAGES_DIR,
    prefix: MASCOT_IMAGES_PREFIX,
    // O Swagger UI também registra este plugin; sem isso, os dois disputariam o reply.sendFile.
    decorateReply: false,
    maxAge: "1d",
    // SVG pode conter script. Os nossos não têm, mas a CSP impede execução mesmo se alguém abrir o
    // arquivo direto no navegador, e o nosniff impede o navegador de tratar o arquivo como outro tipo.
    setHeaders(reply) {
      reply.header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
      reply.header("X-Content-Type-Options", "nosniff");
    },
  });
}
