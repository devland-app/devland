import "./app/shell.css";

import { useState } from "react";

import { Header } from "./app/Header.tsx";
import { useHashRoute } from "./app/useHashRoute.ts";
import { CartButton } from "./features/cart/CartButton.tsx";
import { CartDrawer } from "./features/cart/CartDrawer.tsx";
import { CartProvider } from "./features/cart/CartProvider.tsx";
import { CatalogPage } from "./features/catalog/CatalogPage.tsx";

export default function App() {
  const route = useHashRoute();
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <CartProvider>
      <Header route={route} actions={<CartButton onOpen={() => setCartOpen(true)} />} />
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
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </CartProvider>
  );
}
