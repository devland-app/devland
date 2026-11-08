import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { MASCOT_LESSONS } from "../../src/modules/catalog/catalog.lessons.js";
import { QUIZ_CONTENT } from "../../src/modules/quizzes/quizzes.content.js";

const IMAGES_DIR = new URL("../../static/mascots/", import.meta.url);
const files = readdirSync(IMAGES_DIR).filter((name) => name.endsWith(".svg"));
const count = (svg: string, pattern: RegExp) => svg.match(pattern)?.length ?? 0;

// Mascote novo precisa de três peças com o mesmo slug: o desenho, a lição e o quiz. Faltando uma, a
// vitrine mostra um mascote sem aula, ou um quiz paga por um mascote que não existe.
describe("ilustrações dos mascotes", () => {
  it("cada lição tem desenho e quiz com o mesmo slug, e vice-versa", () => {
    const fromImages = files.map((name) => name.replace(/\.svg$/, "")).sort();
    expect(Object.keys(MASCOT_LESSONS).sort()).toEqual(fromImages);
    expect(QUIZ_CONTENT.map((quiz) => quiz.slug).sort()).toEqual(fromImages);
  });

  // O site esconde o fundo redondo, faz os olhos piscarem e troca por olhos felizes ao adotar:
  // depende dessas classes em todo desenho.
  it.each(files)("%s tem título, fundo e olhos que piscam", (name) => {
    const svg = readFileSync(new URL(name, IMAGES_DIR), "utf8");
    expect(svg).toMatch(/<title id="title">[^<]+<\/title>/);
    // Fundo redondo e, em alguns, a sombra no chão: os dois somem no site.
    expect(count(svg, /class="backdrop"/g)).toBeGreaterThanOrEqual(1);
    // Dois olhos de frente, um de perfil; cada olho tem a versão feliz, que aparece ao adotar.
    const eyes = count(svg, /class="eye"/g);
    expect(eyes).toBeGreaterThanOrEqual(1);
    expect(count(svg, /class="eye-happy"/g)).toBe(eyes);
  });

  it.each(files)("%s não tem script nem atributo de evento", (name) => {
    const svg = readFileSync(new URL(name, IMAGES_DIR), "utf8");
    expect(svg).not.toMatch(/<script|<foreignObject|\son[a-z]+=|javascript:/i);
  });
});
