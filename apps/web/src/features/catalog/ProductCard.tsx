import { apiAssetUrl } from "../../shared/api/client.ts";
import type { Product } from "../../shared/api/types.ts";
import { formatCents } from "../../shared/format.ts";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="card clay">
      <div className="card-art">
        <img
          src={apiAssetUrl(product.imageUrl)}
          alt={`Ilustração de massinha: ${product.name}`}
          width={210}
          height={210}
          loading="lazy"
        />
      </div>
      <h2>{product.name}</h2>
      <div className="card-body">
        <span className="chip">{product.concept}</span>
        <p>{product.description}</p>
      </div>
      <div className="buy-row">
        <p className="price">
          <strong>{formatCents(product.priceCents)}</strong>
          <small>
            de mentirinha · {product.stock > 0 ? `${product.stock} em estoque` : "esgotado"}
          </small>
        </p>
      </div>
    </article>
  );
}
