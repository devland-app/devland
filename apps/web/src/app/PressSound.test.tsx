import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SoundProvider } from "../shared/sound/SoundProvider.tsx";
import { playSound } from "../shared/sound/synth.ts";
import { PressSound } from "./PressSound.tsx";

vi.mock("../shared/sound/synth.ts", () => ({ playSound: vi.fn() }));

function renderLinks() {
  return render(
    <SoundProvider>
      <PressSound />
      <nav className="tabs">
        <a href="#vitrine">Vitrine</a>
      </nav>
      <a className="btn" href="#quizzes">
        <span>Ganhar moedas</span>
      </a>
      <a href="#sobre">Link de texto</a>
      <button type="button">Botão</button>
    </SoundProvider>,
  );
}

describe("PressSound", () => {
  beforeEach(() => {
    vi.mocked(playSound).mockClear();
  });

  it("links com cara de botão fazem o som de botão apertado; os outros, não", async () => {
    localStorage.setItem("devland-sound", "true");
    const user = userEvent.setup();
    renderLinks();
    await user.click(screen.getByText("Ganhar moedas"));
    await user.click(screen.getByRole("link", { name: "Vitrine" }));
    expect(vi.mocked(playSound).mock.calls).toEqual([["press"], ["press"]]);

    await user.click(screen.getByRole("link", { name: "Link de texto" }));
    await user.click(screen.getByRole("button", { name: "Botão" }));
    expect(playSound).toHaveBeenCalledTimes(2);
  });

  it("com o som desligado, fica em silêncio", async () => {
    localStorage.setItem("devland-sound", "false");
    const user = userEvent.setup();
    renderLinks();
    await user.click(screen.getByText("Ganhar moedas"));
    expect(playSound).not.toHaveBeenCalled();
  });
});
