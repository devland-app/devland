import "./app/shell.css";

import { useState } from "react";

import { Header } from "./app/Header.tsx";
import { useHashRoute } from "./app/useHashRoute.ts";
import { CartButton } from "./features/cart/CartButton.tsx";
import { CartDrawer } from "./features/cart/CartDrawer.tsx";
import { CatalogPage } from "./features/catalog/CatalogPage.tsx";
import { CheckoutDialog } from "./features/checkout/CheckoutDialog.tsx";
import { CollectionPage } from "./features/collection/CollectionPage.tsx";
import { MascotPage } from "./features/mascot/MascotPage.tsx";
import { AdoptionsProvider } from "./shared/adoptions/AdoptionsProvider.tsx";
import type { Order } from "./shared/api/types.ts";
import { CartProvider } from "./shared/cart/CartProvider.tsx";

type Checkout = { open: false } | { open: true; resumeOrder?: Order };

export default function App() {
  const route = useHashRoute();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState<Checkout>({ open: false });

  function openCheckout(resumeOrder?: Order) {
    setCartOpen(false);
    setCheckout({ open: true, resumeOrder });
  }

  return (
    // Adoções por fora: o carrinho esconde o que já foi adotado ou está aguardando pagamento.
    <AdoptionsProvider>
      <CartProvider>
        <Header route={route} actions={<CartButton onOpen={() => setCartOpen(true)} />} />
        <main className="gutter">
          <div className="wrap">
            {route.name === "vitrine" && <CatalogPage />}
            {route.name === "mascotes" && <CollectionPage />}
            {route.name === "mascote" && <MascotPage key={route.slug} slug={route.slug} />}
          </div>
        </main>
        <footer className="site-footer gutter">
          <div className="wrap">
            DevZoo · loja simulada com mascotes originais · nenhum produto é vendido
          </div>
        </footer>
        <CartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          onCheckout={() => openCheckout()}
          onPayPending={(order) => openCheckout(order)}
        />
        {checkout.open && (
          <CheckoutDialog
            onClose={() => setCheckout({ open: false })}
            resumeOrder={checkout.resumeOrder}
          />
        )}
      </CartProvider>
    </AdoptionsProvider>
  );
}
