// A ilustração vem da nossa própria API, mas vai entrar direto no HTML da página. Por segurança, só
// passa o que é desenho: scripts, foreignObject, atributos de evento (onclick…) e links para fora do
// próprio SVG são removidos. Os ids ganham um prefixo para não colidir com outros SVGs da página.
export function prepareInlineSvg(raw: string, prefix: string): string | null {
  const document = new DOMParser().parseFromString(raw, "image/svg+xml");
  const svg = document.documentElement;
  if (
    svg.nodeName.toLowerCase() !== "svg" ||
    document.getElementsByTagName("parsererror").length > 0
  ) {
    return null;
  }

  for (const node of [...svg.querySelectorAll("script, foreignObject, title")]) {
    node.remove();
  }
  for (const element of [svg, ...svg.querySelectorAll("*")]) {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const isEvent = name.startsWith("on");
      const isExternalLink =
        (name === "href" || name === "xlink:href") && !attribute.value.trim().startsWith("#");
      if (isEvent || isExternalLink) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  for (const element of [...svg.querySelectorAll("[id]")]) {
    element.id = `${prefix}-${element.id}`;
  }

  // Quem descreve o mascote para leitores de tela é o botão em volta; o desenho em si é decorativo.
  svg.removeAttribute("role");
  svg.removeAttribute("aria-labelledby");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  return new XMLSerializer()
    .serializeToString(svg)
    .replace(/url\(#([^)]+)\)/g, (_match, id: string) => `url(#${prefix}-${id})`);
}
