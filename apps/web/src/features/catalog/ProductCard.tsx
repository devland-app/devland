import { useAdoptions } from "../../shared/adoptions/adoptionsContext.ts";
import type { Product } from "../../shared/api/types.ts";
import { useCart } from "../../shared/cart/cartContext.ts";
import { FLAGS } from "../../shared/flags.ts";
import { useSound } from "../../shared/sound/soundContext.ts";
import { Coins } from "../../shared/ui/Coins.tsx";
import { MascotArt } from "../../shared/ui/MascotArt.tsx";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const cart = useCart();
  const adoptions = useAdoptions();
  const sound = useSound();
  const adopted = adoptions.adopted.has(product.id);
  const pending = adoptions.isPending(product.id);
  const inCart = cart.has(product.id);

  return (
    <article className={`card clay${adopted ? " card--adopted" : ""}`}>
      <div className="card-art">
        <MascotArt
          product={product}
          size={210}
          label={`Ilustração de massinha: ${product.name}`}
          play={FLAGS.showcaseAnimations}
        />
      </div>
      <h2>{product.name}</h2>
      <div className="card-body">
        <span className="chip">{product.concept}</span>
        <p>{product.description}</p>
      </div>
      <div className="buy-row">
        <p className="price">
          <Coins value={product.priceCoins} size="lg" />
        </p>
        <AdoptButton
          product={product}
          adopted={adopted}
          pending={pending}
          inCart={inCart}
          onToggle={() => {
            sound.play(inCart ? "unpop" : "pop");
            cart.toggle(product);
          }}
        />
      </div>
      {adopted && (
        <a className="card-link" href={`#mascote-${product.slug}`}>
          Conhecer meu mascote →
        </a>
      )}
    </article>
  );
}

interface AdoptButtonProps {
  product: Product;
  adopted: boolean;
  pending: boolean;
  inCart: boolean;
  onToggle: () => void;
}

// Um de cada: adotado e aguardando pagamento ficam desabilitados; no carrinho, o botão fica
// "apertado" (aria-pressed) e um novo clique tira o mascote.
function AdoptButton({ product, adopted, pending, inCart, onToggle }: AdoptButtonProps) {
  if (adopted) {
    return (
      <button className="btn btn--toggle" type="button" disabled>
        Adotado ✓
      </button>
    );
  }
  if (pending) {
    return (
      <button className="btn btn--toggle" type="button" disabled>
        Aguardando pagamento
      </button>
    );
  }
  if (product.stock === 0) {
    return (
      <button className="btn btn--toggle" type="button" disabled>
        Esgotado
      </button>
    );
  }
  return (
    <button
      className="btn btn--toggle"
      type="button"
      onClick={onToggle}
      aria-pressed={inCart}
      aria-label={
        inCart ? `${product.name} está no carrinho. Tirar do carrinho` : `Adotar ${product.name}`
      }
    >
      {inCart ? "Incluído ✓" : "Adotar"}
    </button>
  );
}
