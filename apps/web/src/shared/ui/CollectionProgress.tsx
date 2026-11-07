import "./progress.css";

interface CollectionProgressProps {
  adopted: number;
  total: number;
}

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
      <progress
        className="progress-bar"
        max={total}
        value={adopted}
        aria-label="Mascotes adotados"
      />
    </div>
  );
}
