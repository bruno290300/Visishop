function formatPrice(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "Sin precio";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function formatMeta(recommendation) {
  return [recommendation.category, recommendation.type, recommendation.brand]
    .filter(Boolean)
    .join(" / ");
}

function RecommendationModal({ open, product, onClose, onChoose }) {
  if (!open || !product) return null;

  const recommendations = product.recommendations || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <section className="modal-enter max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/20 bg-slate-900/95 shadow-2xl shadow-slate-950/70">
        <header className="border-b border-white/10 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/75">
                Panel de recomendaciones
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">
                {product.name}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                No se encontro disponibilidad para este producto. Estas alternativas se ordenan por similitud.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-red-300/20 bg-red-300/10 px-3 py-2">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-red-100/80">
                Estado
              </p>
              <p className="text-sm font-semibold text-red-100">Sin disponibilidad</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-cyan-100/80">
                Categoria
              </p>
              <p className="truncate text-sm font-semibold text-cyan-100">
                {product.category || "Sin categoria"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-slate-400">
                Codigo
              </p>
              <p className="truncate font-mono text-sm font-semibold text-slate-100">
                {product.barcode}
              </p>
            </div>
          </div>
        </header>

        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-5">
          {recommendations.length ? (
            <div className="space-y-3">
              {recommendations.map((recommendation, index) => (
                <article
                  key={recommendation.barcode}
                  className="rounded-2xl border border-white/15 bg-slate-950/45 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-cyan-300/15 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                          #{index + 1}
                        </span>
                        <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-emerald-100">
                          {recommendation.similarityPercent}% similitud
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-slate-100">
                        {recommendation.name}
                      </h3>
                      <p className="mt-1 text-xs text-cyan-100/75">
                        {formatMeta(recommendation)}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-400">
                        Codigo: {recommendation.barcode}
                      </p>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-lg font-semibold text-white">
                        {formatPrice(recommendation.price)}
                      </p>
                      <button
                        type="button"
                        onClick={() => onChoose(product.id, recommendation)}
                        className="mt-2 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 active:scale-[0.98] sm:w-auto"
                      >
                        Elegir este producto
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Criterios coincidentes
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(recommendation.criteria?.length
                        ? recommendation.criteria
                        : [recommendation.reason]
                      ).map((criterion) => (
                        <span
                          key={criterion}
                          className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-200"
                        >
                          {criterion}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-slate-300">
              No hay alternativas disponibles para este producto.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default RecommendationModal;
