import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getMascotSvg } from "../api/client.ts";
import { MascotArt } from "./MascotArt.tsx";

vi.mock("../api/client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client.ts")>()),
  getMascotSvg: vi.fn(),
}));

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><circle class="backdrop"/><rect fill="url(#g)"/></svg>`;

describe("MascotArt", () => {
  beforeEach(() => {
    vi.mocked(getMascotSvg).mockReset();
  });

  it("mostra um espaço reservado enquanto o desenho carrega, e depois o SVG inline", async () => {
    vi.mocked(getMascotSvg).mockResolvedValue(SVG);
    const { container } = render(<MascotArt product={{ imageUrl: "/a.svg?v=1" }} size={100} />);
    expect(container.querySelector(".mascot-art.is-loading")).not.toBeNull();
    await waitFor(() => expect(container.querySelector(".mascot-art svg")).not.toBeNull());
    expect(container.querySelector(".mascot-art")).toHaveAttribute("aria-hidden", "true");
  });

  it("com rótulo, vira uma imagem com nome para leitor de tela", async () => {
    vi.mocked(getMascotSvg).mockResolvedValue(SVG);
    render(<MascotArt product={{ imageUrl: "/b.svg?v=1" }} size={100} label="Caranguejo" />);
    expect(await screen.findByRole("img", { name: "Caranguejo" })).toBeInTheDocument();
  });

  it("se o desenho não carrega, mostra a imagem comum no lugar", async () => {
    vi.mocked(getMascotSvg).mockRejectedValue(new Error("offline"));
    render(<MascotArt product={{ imageUrl: "/c.svg?v=1" }} size={80} label="Abelha" />);
    const image = await screen.findByRole("img", { name: "Abelha" });
    expect(image.tagName).toBe("IMG");
    expect(image).toHaveAttribute("src", "http://localhost:3333/c.svg?v=1");
  });

  it("baixa cada ilustração uma vez, e dois desenhos iguais não dividem ids", async () => {
    vi.mocked(getMascotSvg).mockResolvedValue(SVG);
    const { container } = render(
      <>
        <MascotArt product={{ imageUrl: "/d.svg?v=1" }} size={50} />
        <MascotArt product={{ imageUrl: "/d.svg?v=1" }} size={50} />
      </>,
    );
    await waitFor(() => expect(container.querySelectorAll(".mascot-art svg")).toHaveLength(2));
    expect(getMascotSvg).toHaveBeenCalledTimes(1);
    const ids = [...container.querySelectorAll("linearGradient")].map((element) => element.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("MascotArt: piscadas", () => {
  beforeEach(() => {
    vi.mocked(getMascotSvg).mockResolvedValue(SVG);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("pisca sozinho de tempos em tempos, por um instante", async () => {
    // Relógio falso antes de montar: a primeira piscada é agendada na montagem.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { container } = render(
      <MascotArt product={{ imageUrl: "/e.svg?v=1" }} size={50} blink="lively" />,
    );
    await waitFor(() => expect(container.querySelector(".mascot-art svg")).not.toBeNull());
    let blinked = false;
    for (let step = 0; step < 60 && !blinked; step += 1) {
      act(() => vi.advanceTimersByTime(100));
      blinked = container.querySelector(".mascot-art.is-blinking") !== null;
    }
    expect(blinked).toBe(true);
    act(() => vi.advanceTimersByTime(200));
    expect(container.querySelector(".mascot-art.is-blinking")).toBeNull();
  });

  it("com piscada desligada, nunca pisca", async () => {
    // Relógio falso antes de montar: a primeira piscada é agendada na montagem.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { container } = render(
      <MascotArt product={{ imageUrl: "/f.svg?v=1" }} size={50} blink="off" />,
    );
    await waitFor(() => expect(container.querySelector(".mascot-art svg")).not.toBeNull());
    act(() => vi.advanceTimersByTime(20_000));
    expect(container.querySelector(".mascot-art.is-blinking")).toBeNull();
  });
});

describe("MascotArt: animações da vitrine", () => {
  beforeEach(() => {
    vi.mocked(getMascotSvg).mockResolvedValue(SVG);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function renderShowcase(play: boolean, imageUrl: string) {
    // Relógio falso antes de montar: a primeira animação é agendada na montagem.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { container } = render(
      <MascotArt product={{ imageUrl }} size={50} blink="off" play={play} />,
    );
    await waitFor(() => expect(container.querySelector(".mascot-art svg")).not.toBeNull());
    return container;
  }

  it("de vez em quando liga a animação por um instante, e depois para", async () => {
    const container = await renderShowcase(true, "/g.svg?v=1");
    expect(container.querySelector(".mascot-art.is-playing")).toBeNull();
    let played = false;
    for (let step = 0; step < 300 && !played; step += 1) {
      act(() => vi.advanceTimersByTime(100));
      played = container.querySelector(".mascot-art.is-playing") !== null;
    }
    expect(played).toBe(true);
    act(() => vi.advanceTimersByTime(1800));
    expect(container.querySelector(".mascot-art.is-playing")).toBeNull();
  });

  it("fora da vitrine não anima", async () => {
    const container = await renderShowcase(false, "/h.svg?v=1");
    act(() => vi.advanceTimersByTime(60_000));
    expect(container.querySelector(".mascot-art.is-playing")).toBeNull();
  });

  it("com menos movimento pedido, não anima nem na vitrine", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const container = await renderShowcase(true, "/i.svg?v=1");
    act(() => vi.advanceTimersByTime(60_000));
    expect(container.querySelector(".mascot-art.is-playing")).toBeNull();
  });
});
