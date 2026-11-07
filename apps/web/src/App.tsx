import "./app/shell.css";

import { useState } from "react";

import { Header } from "./app/Header.tsx";
import { useHashRoute } from "./app/useHashRoute.ts";
import { CartButton } from "./features/cart/CartButton.tsx";
import { CartDrawer } from "./features/cart/CartDrawer.tsx";
import { CartProvider } from "./features/cart/CartProvider.tsx";
import { CatalogPage } from "./features/catalog/CatalogPage.tsx";
import { CheckoutDialog } from "./features/checkout/CheckoutDialog.tsx";
import { OrdersPage } from "./features/orders/OrdersPage.tsx";
import type { Order } from "./shared/api/types.ts";

type Checkout = { open: false } | { open: true; resumeOrder?: Order };

export default function App() {
  const route = useHashRoute();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState<Checkout>({ open: false });
  // Muda a cada checkout fechado: a lista de pedidos é recarregada e mostra o status novo.
  const [ordersVersion, setOrdersVersion] = useState(0);

  function closeCheckout() {
    setCheckout({ open: false });
    setOrdersVersion((version) => version + 1);
  }

  return (
    <CartProvider>
      <Header route={route} actions={<CartButton onOpen={() => setCartOpen(true)} />} />
      <main className="gutter">
        <div className="wrap">
          {route === "vitrine" ? (
            <CatalogPage />
          ) : (
            <OrdersPage
              key={ordersVersion}
              onPay={(order) => setCheckout({ open: true, resumeOrder: order })}
            />
          )}
        </div>
      </main>
      <footer className="site-footer gutter">
        <div className="wrap">
          DevZoo · loja de brincadeira com mascotes originais · nenhum produto é vendido de verdade
        </div>
      </footer>
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckout({ open: true });
        }}
      />
      {checkout.open && (
        <CheckoutDialog onClose={closeCheckout} resumeOrder={checkout.resumeOrder} />
      )}
    </CartProvider>
  );
}
