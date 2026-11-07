import { describe, expect, it } from "vitest";

import { prepareInlineSvg } from "./prepareSvg.ts";

// O SVG entra direto no HTML da página: tudo que não for desenho precisa sair.
const HOSTILE = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10" role="img" aria-labelledby="t">
  <title id="t">Mascote</title>
  <script>alert("xss")</script>
  <foreignObject><div>html escondido</div></foreignObject>
  <defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs>
  <circle id="c" cx="5" cy="5" r="4" fill="url(#g)" onclick="alert(1)" onload="alert(2)"/>
  <a href="javascript:alert(3)"><rect width="1" height="1"/></a>
  <use xlink:href="https://site-estranho.example/x.svg#a"/>
  <use href="#c"/>
</svg>`;

describe("prepareInlineSvg", () => {
  const svg = prepareInlineSvg(HOSTILE, "m1") ?? "";

  it("remove scripts, foreignObject, title e atributos de evento", () => {
    expect(svg).not.toMatch(/<script|foreignObject|<title|onclick|onload|alert/);
  });

  it("remove links para fora do próprio SVG e mantém as referências internas", () => {
    expect(svg).not.toContain("javascript:");
    expect(svg).not.toContain("site-estranho");
    expect(svg).toContain('href="#c"');
  });

  it("prefixa ids e url(#id) para não colidir com outros desenhos da página", () => {
    expect(svg).toContain('id="m1-g"');
    expect(svg).toContain('id="m1-c"');
    expect(svg).toContain("url(#m1-g)");
  });

  it("marca o desenho como decorativo", () => {
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain("aria-labelledby");
    expect(svg).not.toContain('role="img"');
  });

  it("devolve null para o que não é SVG válido", () => {
    expect(prepareInlineSvg("<svg><circle></svg>", "m2")).toBeNull();
    expect(prepareInlineSvg("<html><body>oi</body></html>", "m3")).toBeNull();
  });
});
