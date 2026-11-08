import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useHashRoute } from "./useHashRoute.ts";

function routeFor(hash: string) {
  window.location.hash = hash;
  return renderHook(() => useHashRoute()).result.current;
}

describe("useHashRoute", () => {
  it.each([
    ["", { name: "vitrine" }],
    ["#vitrine", { name: "vitrine" }],
    ["#qualquer-coisa", { name: "vitrine" }],
    ["#quizzes", { name: "quizzes" }],
    ["#quiz-castor-do-cache", { name: "quiz", slug: "castor-do-cache" }],
    ["#quiz-", { name: "vitrine" }],
    ["#mascotes", { name: "mascotes" }],
    ["#mascote-polvo-orquestrador", { name: "mascote", slug: "polvo-orquestrador" }],
    ["#mascote-", { name: "vitrine" }],
    ["#mascote-a%20b", { name: "mascote", slug: "a b" }],
    ["#sobre", { name: "sobre" }],
  ])("%s abre %o", (hash, route) => {
    expect(routeFor(hash)).toEqual(route);
  });

  it("acompanha a troca de endereço e volta ao topo da página", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    window.location.hash = "#vitrine";
    const { result } = renderHook(() => useHashRoute());
    act(() => {
      window.location.hash = "#mascotes";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(result.current).toEqual({ name: "mascotes" });
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });
});
