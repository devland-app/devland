const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });
const integer = new Intl.NumberFormat("pt-BR");

// As moedas são virtuais e inteiras; só a tela escreve "moeda" ou "moedas".
export function formatCoins(coins: number): string {
  return `${integer.format(coins)} ${coins === 1 ? "moeda" : "moedas"}`;
}

export function formatNumber(value: number): string {
  return integer.format(value);
}

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}
