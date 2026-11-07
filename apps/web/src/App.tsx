import "./app/shell.css";

import { Header } from "./app/Header.tsx";
import { useHashRoute } from "./app/useHashRoute.ts";
import { CatalogPage } from "./features/catalog/CatalogPage.tsx";

export default function App() {
  const route = useHashRoute();

  return (
    <>
      <Header route={route} />
      <main className="gutter">
        <div className="wrap">
          {route === "vitrine" ? (
            <CatalogPage />
          ) : (
            <p className="fine">Seus pedidos aparecem aqui em breve.</p>
          )}
        </div>
      </main>
      <footer className="site-footer gutter">
        <div className="wrap">
          DevZoo · loja de brincadeira com mascotes originais · nenhum produto é vendido de verdade
        </div>
      </footer>
    </>
  );
}
