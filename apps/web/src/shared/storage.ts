// localStorage pode estar indisponível (aba anônima, dados bloqueados): ler e gravar nunca pode
// derrubar a página. O guard valida o que foi lido, porque o conteúdo pode ser antigo ou editado.
export function readStored<T>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem armazenamento: o estado segue só em memória enquanto a página estiver aberta.
  }
}
