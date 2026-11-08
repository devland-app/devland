import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App.tsx";
import { ApiError } from "./shared/api/client.ts";
import { playSound } from "./shared/sound/synth.ts";
import { fake, FakeBackend } from "./test/fakeApi.ts";

vi.mock("./shared/api/client.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./shared/api/client.ts")>();
  const { fakeClient } = await import("./test/fakeApi.ts");
  return { ...actual, ...fakeClient };
});

// O pagamento espera 1,4 s de propósito (a etapa "processando" fica visível).
const PAYMENT_TIMEOUT = { timeout: 4000 };

let user: UserEvent;
vi.mock("./shared/sound/synth.ts", () => ({ playSound: vi.fn() }));

let backend: FakeBackend;

beforeEach(() => {
  backend = new FakeBackend(ApiError);
  vi.mocked(playSound).mockClear();
  fake.backend = backend;
  user = userEvent.setup();
});

function renderApp(hash = "#vitrine") {
  window.location.hash = hash;
  return render(<App />);
}

async function go(hash: string) {
  window.location.hash = hash;
  await waitFor(() => expect(window.location.hash).toBe(hash));
}

const adoptButton = (name: string) => screen.findByRole("button", { name: `Adotar ${name}` });
const cartButton = () => screen.getByRole("button", { name: /^Carrinho,/ });
const cartDrawer = () => screen.getByRole("dialog", { name: "Seu carrinho" });

async function openCheckoutWith(name: string) {
  await user.click(await adoptButton(name));
  await user.click(cartButton());
  await user.click(within(cartDrawer()).getByRole("button", { name: "Finalizar adoção" }));
  const checkout = await screen.findByRole("dialog", { name: "Adoção" });
  await user.click(within(checkout).getByRole("button", { name: "Ir para o pagamento" }));
  await within(checkout).findByRole("heading", { name: "Pagamento com moedas" });
  return checkout;
}

async function answerQuiz(choices: Array<"Certa" | "Errada">) {
  for (const [index, choice] of choices.entries()) {
    await user.click(await screen.findByRole("button", { name: `${choice} ${index + 1}` }));
    const next = index + 1 < choices.length ? "Próxima pergunta" : "Ver resultado";
    await user.click(await screen.findByRole("button", { name: next }));
  }
}

describe("vitrine e carrinho", () => {
  it("começa sem moedas, com os preços em moedas e a aba certa marcada", async () => {
    renderApp();
    expect(await adoptButton("Caranguejo dos Contêineres")).toBeEnabled();
    expect(screen.getByText("Saldo: 0 moedas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vitrine" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByText("120 moedas").length).toBeGreaterThan(0);
  });

  it("adotar é liga e desliga, e o carrinho acompanha", async () => {
    renderApp();
    await user.click(await adoptButton("Caranguejo dos Contêineres"));
    const included = screen.getByRole("button", {
      name: /Caranguejo dos Contêineres está no carrinho/,
    });
    expect(included).toHaveAttribute("aria-pressed", "true");
    expect(included).toHaveTextContent("Incluído");
    expect(cartButton()).toHaveAccessibleName("Carrinho, 1 item");

    await user.click(included);
    expect(await adoptButton("Caranguejo dos Contêineres")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(cartButton()).toHaveAccessibleName("Carrinho, 0 itens");
  });

  it("o carrinho soma, remove e guarda os mascotes neste navegador", async () => {
    renderApp();
    await user.click(await adoptButton("Corujinha das Branches"));
    await user.click(await adoptButton("Abelha dos Logs"));
    await user.click(cartButton());
    const drawer = cartDrawer();
    expect(within(drawer).getByText("160 moedas")).toBeInTheDocument();

    await user.click(
      within(drawer).getByRole("button", { name: "Remover Abelha dos Logs do carrinho" }),
    );
    expect(within(drawer).getByText("80 moedas", { selector: ".total-row *" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("devland-cart") ?? "[]")).toHaveLength(1);
  });

  it("carrinho vazio não deixa finalizar", async () => {
    renderApp();
    await adoptButton("Caranguejo dos Contêineres");
    await user.click(cartButton());
    expect(within(cartDrawer()).getByText("Carrinho vazio")).toBeInTheDocument();
    expect(within(cartDrawer()).getByRole("button", { name: "Finalizar adoção" })).toBeDisabled();
  });

  it('"Continuar olhando" fecha o carrinho e volta para a vitrine de qualquer página', async () => {
    renderApp("#mascotes");
    await screen.findByRole("heading", { name: "Meus mascotes" });
    await user.click(cartButton());
    await user.click(within(cartDrawer()).getByRole("link", { name: "Continuar olhando" }));
    await waitFor(() => expect(window.location.hash).toBe("#vitrine"));
    await waitFor(() =>
      expect(document.querySelector("dialog.dialog--drawer")).not.toHaveAttribute("open"),
    );
  });
});

describe("adoção com moedas", () => {
  it("sem saldo, diz quanto falta e guarda o pedido aguardando pagamento", async () => {
    renderApp();
    const checkout = await openCheckoutWith("Caranguejo dos Contêineres");
    expect(within(checkout).getByText(/Faltam 120 moedas/)).toBeInTheDocument();
    expect(within(checkout).getByRole("button", { name: "Pagar 120 moedas" })).toBeDisabled();

    await user.click(within(checkout).getByRole("button", { name: "Pagar depois" }));
    const waiting = await screen.findByRole("button", { name: "Aguardando pagamento" });
    expect(waiting).toBeDisabled();

    await user.click(cartButton());
    const drawer = cartDrawer();
    expect(within(drawer).getByText(/Caranguejo dos Contêineres/)).toBeInTheDocument();
    expect(within(drawer).getByText("Carrinho vazio")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("devland-orders") ?? "[]")).toHaveLength(1);
  });

  it("ganha as moedas no quiz, paga o pedido pendente e desbloqueia o mascote", async () => {
    renderApp();
    const checkout = await openCheckoutWith("Caranguejo dos Contêineres");
    await user.click(within(checkout).getByRole("link", { name: "Ganhe moedas nos quizzes" }));
    await waitFor(() => expect(window.location.hash).toBe("#quizzes"));

    await user.click(await screen.findByRole("link", { name: /Quiz de Contêineres/ }));
    await answerQuiz(["Certa", "Certa"]);
    expect(await screen.findByRole("heading", { name: "Gabaritou!" })).toBeInTheDocument();
    expect(screen.getByText("Saldo: 120 moedas")).toBeInTheDocument();

    await user.click(cartButton());
    await user.click(within(cartDrawer()).getByRole("button", { name: "Pagar agora" }));
    const payment = await screen.findByRole("dialog", { name: "Adoção" });
    expect(within(payment).getByText("Saldo depois")).toBeInTheDocument();
    await user.click(within(payment).getByRole("button", { name: "Pagar 120 moedas" }));
    expect(
      await within(payment).findByRole("heading", { name: "Adoção concluída!" }, PAYMENT_TIMEOUT),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Saldo: 0 moedas")).toBeInTheDocument());

    await user.click(within(payment).getByRole("link", { name: "Ver meus mascotes" }));
    expect(await screen.findByText("1 de 3 mascotes adotados")).toBeInTheDocument();
    expect(screen.getAllByText("Ainda não adotado")).toHaveLength(2);

    await user.click(screen.getByRole("link", { name: /Caranguejo dos Contêineres/ }));
    expect(await screen.findByRole("heading", { name: "Em poucas palavras" })).toBeInTheDocument();
    // Clique alterna o truque do desenho (o mesmo da vitrine) com as reações do corpo todo.
    const mascot = screen.getByRole("button", { name: "Interagir com Caranguejo dos Contêineres" });
    await user.click(mascot);
    expect(document.querySelector(".mascot-art.is-playing.is-happy")).not.toBeNull();
    await user.click(mascot);
    expect(document.querySelector(".mascot-art.is-jump.is-happy")).not.toBeNull();

    await go("#vitrine");
    expect(await screen.findByRole("button", { name: "Adotado ✓" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Conhecer meu mascote →" })).toBeInTheDocument();
  });

  it("o mascote adotado sai do carrinho e não entra de novo", async () => {
    renderApp();
    const checkout = await openCheckoutWith("Corujinha das Branches");
    await user.click(within(checkout).getByRole("button", { name: "Pagar depois" }));
    expect(await screen.findByRole("button", { name: "Aguardando pagamento" })).toBeDisabled();
    expect(cartButton()).toHaveAccessibleName("Carrinho, 0 itens");
  });

  it("erro da API ao criar o pedido aparece na tela, e o carrinho continua", async () => {
    renderApp();
    backend.failNext("createOrder", 409, "Só temos 0 unidade(s) de Abelha dos Logs no estoque.");
    await user.click(await adoptButton("Abelha dos Logs"));
    await user.click(cartButton());
    await user.click(within(cartDrawer()).getByRole("button", { name: "Finalizar adoção" }));
    const checkout = await screen.findByRole("dialog", { name: "Adoção" });
    await user.click(within(checkout).getByRole("button", { name: "Ir para o pagamento" }));
    expect(await within(checkout).findByRole("alert")).toHaveTextContent("Só temos 0 unidade(s)");
    expect(cartButton()).toHaveAccessibleName("Carrinho, 1 item");
  });

  it("recusa no pagamento aparece na tela e permite tentar de novo", async () => {
    // Carteira com saldo já salva neste navegador antes de abrir a loja.
    const walletId = (await backend.createWallet()).id;
    backend.wallets.set(walletId, 500);
    localStorage.setItem("devland-wallet", JSON.stringify(walletId));
    renderApp();
    const checkout = await openCheckoutWith("Abelha dos Logs");
    backend.failNext("payOrder", 0, "Não deu para falar com a loja agora.");
    await user.click(within(checkout).getByRole("button", { name: "Pagar 80 moedas" }));
    expect(await within(checkout).findByRole("alert", {}, PAYMENT_TIMEOUT)).toHaveTextContent(
      "Não deu para falar com a loja agora.",
    );
    await user.click(within(checkout).getByRole("button", { name: "Pagar 80 moedas" }));
    expect(
      await within(checkout).findByRole("heading", { name: "Adoção concluída!" }, PAYMENT_TIMEOUT),
    ).toBeInTheDocument();
  });
});

describe("quizzes", () => {
  it("errou paga depois; acerto repetido não paga de novo", async () => {
    renderApp("#quiz-corujinha-das-branches");
    await answerQuiz(["Errada", "Certa"]);
    expect(await screen.findByRole("heading", { name: "Você acertou 1 de 2" })).toBeInTheDocument();
    expect(screen.getByText(/Ainda faltam 40 moedas neste quiz/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(await screen.findByText("Pergunta 1 sobre Controle de versão?")).toBeInTheDocument();
    expect(screen.getByText(/Vale/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Certa 1" }));
    expect(await screen.findByRole("heading", { name: /Acertou! \+/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Próxima pergunta" }));
    expect(await screen.findByText("Moedas já ganhas")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Certa 2" }));
    expect(await screen.findByRole("heading", { name: "Acertou!" })).toBeInTheDocument();
    expect(screen.getByText(/já tinha ganhado antes/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver resultado" }));
    expect(await screen.findByRole("heading", { name: "Gabaritou!" })).toBeInTheDocument();
    expect(screen.getByText(/Jogar de novo serve para treinar/)).toBeInTheDocument();
    expect(screen.getByText("Saldo: 80 moedas")).toBeInTheDocument();

    await go("#quizzes");
    const tile = await screen.findByRole("link", { name: /Quiz de Controle de versão/ });
    expect(tile).toHaveTextContent("Todas as moedas ganhas");
  });

  it("a lista mostra o que cada quiz paga e o progresso", async () => {
    renderApp("#quizzes");
    const tile = await screen.findByRole("link", { name: /Quiz de Contêineres/ });
    expect(tile).toHaveTextContent("2 perguntas · até");
    expect(tile).toHaveAttribute("href", "#quiz-caranguejo-dos-conteineres");
  });

  it("erro ao carregar a lista mostra a mensagem e deixa tentar de novo", async () => {
    backend.failNext("listQuizzes", 0, "Sem conexão com a loja.");
    renderApp("#quizzes");
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com a loja.");
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("link", { name: /Quiz de Contêineres/ })).toBeInTheDocument();
  });

  it("quiz inexistente mostra o erro da API", async () => {
    renderApp("#quiz-unicornio");
    expect(await screen.findByRole("alert")).toHaveTextContent("Quiz não encontrado.");
  });
});

describe("páginas e preferências", () => {
  it("vitrine com a API fora do ar mostra o erro e tenta de novo", async () => {
    backend.failNext("listProducts", 0, "Não deu para falar com a loja agora.");
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não deu para falar com a loja");
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await adoptButton("Caranguejo dos Contêineres")).toBeInTheDocument();
  });

  it("mascote inexistente e mascote ainda não adotado têm páginas próprias", async () => {
    renderApp("#mascote-unicornio");
    expect(
      await screen.findByRole("heading", { name: "Esse mascote não existe" }),
    ).toBeInTheDocument();
    await go("#mascote-abelha-dos-logs");
    expect(
      await screen.findByRole("heading", { name: "Mascote de Observabilidade ainda não adotado" }),
    ).toBeInTheDocument();
  });

  it("a coleção vazia mostra todos como não adotados", async () => {
    renderApp("#mascotes");
    expect(await screen.findByText("0 de 3 mascotes adotados")).toBeInTheDocument();
    expect(screen.getAllByText("Ainda não adotado")).toHaveLength(3);
    expect(screen.getByRole("progressbar", { name: "Mascotes adotados" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("a interrogação do cabeçalho abre a página Sobre, com o Swagger em outra aba", async () => {
    renderApp();
    await user.click(screen.getByRole("link", { name: "Sobre a DevLand" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Por trás da DevLand" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sobre a DevLand" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Accordion nativo: fechado, o texto fica escondido; um clique no título abre, outro fecha.
    const security = screen.getByText("Segurança").closest("details");
    const detail = screen.getByText(/não pede nome, e-mail nem cartão/);
    expect(detail).not.toBeVisible();
    await user.click(screen.getByText("Segurança"));
    expect(security).toHaveAttribute("open");
    expect(detail).toBeVisible();
    await user.click(screen.getByText("Segurança"));
    expect(detail).not.toBeVisible();

    const swagger = screen.getByRole("link", { name: /Explorar a API \(Swagger\)/ });
    expect(swagger).toHaveAttribute("href", "http://localhost:3333/docs");
    expect(swagger).toHaveAttribute("target", "_blank");
    expect(swagger).toHaveAccessibleName(/abre em outra aba/);
  });

  it("abrir o carrinho e trocar o tema têm som, só com o som ligado", async () => {
    renderApp();
    await user.click(cartButton());
    await user.keyboard("{Escape}");
    await user.click(await screen.findByRole("button", { name: /^Tema claro ativo/ }));
    expect(playSound).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: "Som desligado. Ligar som" }));
    vi.mocked(playSound).mockClear();
    await user.click(cartButton());
    await user.keyboard("{Escape}");
    await user.click(await screen.findByRole("button", { name: /^Tema escuro ativo/ }));
    await user.click(await screen.findByRole("button", { name: /^Tema claro ativo/ }));
    expect(vi.mocked(playSound).mock.calls).toEqual([["cart"], ["themeLight"], ["themeDark"]]);
  });

  it("tema e som ficam salvos neste navegador", async () => {
    renderApp();
    await user.click(screen.getByRole("button", { name: "Tema claro ativo. Mudar para o escuro" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("devland-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: /Tema escuro ativo/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Som desligado. Ligar som" }));
    expect(screen.getByRole("button", { name: "Som ligado. Desligar som" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem("devland-sound")).toBe("true");
  });
});
