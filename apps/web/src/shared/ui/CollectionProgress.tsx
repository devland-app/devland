import "./progress.css";

import type { CSSProperties } from "react";

interface CollectionProgressProps {
  adopted: number;
  total: number;
}

// Cada barrinha preenchida ganha uma cor de massinha diferente, como peças de uma coleção.
const SEGMENT_COLORS = ["--coral", "--sun", "--mint", "--lilac"];

export function CollectionProgress({ adopted, total }: CollectionProgressProps) {
  const complete = total > 0 && adopted >= total;

  return (
    <div className={`progress clay${complete ? " progress--complete" : ""}`}>
      <div className="progress-text">
        <strong>
          {complete ? "Coleção completa!" : `${adopted} de ${total} mascotes adotados`}
        </strong>
        <span>
          {complete
            ? "Você adotou todos os mascotes. Não há mais nada para comprar, só para aprender."
            : "Adote um de cada para completar a coleção."}
        </span>
      </div>
      {/* Uma barrinha por mascote; para leitor de tela é uma barra de progresso comum. */}
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Mascotes adotados"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={adopted}
        aria-valuetext={`${adopted} de ${total}`}
      >
        {Array.from({ length: total }, (_, index) => {
          const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length] ?? "--mint";
          const style = {
            "--index": index,
            "--seg-color": `var(${color})`,
            "--seg-deep": `var(${color}-deep, var(${color}))`,
          } as CSSProperties;
          return (
            <span
              key={index}
              className={`progress-seg${index < adopted ? " is-filled" : ""}`}
              style={style}
              aria-hidden="true"
            />
          );
        })}
      </div>
    </div>
  );
}
