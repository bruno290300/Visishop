function formatPrice(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function ProductCard({ product, onScan, onRemove, onViewRecommendations }) {
  const isVerified = product.status === "verified";
  const isError = product.scanFeedback?.type === "error";
  const isSuccess = product.scanFeedback?.type === "success";
  const isWarning = product.scanFeedback?.type === "warning";
  const isUnavailable = product.availabilityStatus === "unavailable";
  const showRecommendations =
    (isUnavailable || isError || isWarning) && product.recommendations?.length > 0;
  const bestRecommendation = product.recommendations?.[0] || null;

  return (
    <article
      className={[
        "card-enter rounded-2xl border bg-slate-900/60 p-4 shadow-lg shadow-slate-950/40 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-white/35",
        isError
          ? "scan-error border-red-300/45"
          : isSuccess
            ? "border-emerald-300/40"
            : isWarning
              ? "border-amber-300/40"
              : "border-white/20",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] uppercase tracking-[0.16em] text-slate-400">
            Producto
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-100">
            {product.name}
          </h3>
          {(product.category || product.type) && (
            <p className="mt-1 text-xs text-cyan-100/75">
              {[product.category, product.type].filter(Boolean).join(" / ")}
            </p>
          )}
          <p className="mt-1 font-mono text-xs text-slate-400">
            Codigo esperado: {product.barcode}
          </p>
          {isUnavailable && (
            <p className="mt-2 text-xs font-semibold text-amber-100">
              Producto sin disponibilidad.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => onRemove?.(product.id)}
            className="rounded-full border border-red-300/30 bg-red-300/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-300/20"
            aria-label={`Eliminar ${product.name}`}
          >
            Eliminar
          </button>
          <span
            className={[
              "rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em]",
              isVerified
                ? "bg-emerald-300/20 text-emerald-200"
                : "bg-amber-300/20 text-amber-200",
            ].join(" ")}
          >
            {isVerified ? "Verificado" : "Pendiente"}
          </span>
          {isUnavailable && (
            <span className="rounded-full bg-red-300/15 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-red-100">
              Sin stock
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={product.isScanning}
        onClick={() => onScan(product.id)}
        className={[
          "mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-300",
          product.isScanning
            ? "cursor-not-allowed bg-cyan-300/20 text-cyan-100"
            : isVerified
              ? "bg-emerald-300/20 text-emerald-100 hover:bg-emerald-300/30"
              : "bg-white/10 text-slate-100 hover:bg-cyan-300/20 hover:text-cyan-100",
        ].join(" ")}
      >
        {product.isScanning && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
        )}
        {product.isScanning
          ? "Escaneando..."
          : isVerified
            ? "Reescanear"
            : "Escanear"}
      </button>

      {product.scanFeedback && (
        <div
          className={[
            "mt-3 rounded-xl border px-3 py-2 text-xs",
            isSuccess
              ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
              : isWarning
                ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                : "border-red-300/40 bg-red-400/10 text-red-100",
          ].join(" ")}
        >
          <p className="font-semibold">{product.scanFeedback.message}</p>
          <p className="mt-1 font-mono">
            Leido: {product.scanFeedback.scannedCode} | Esperado:{" "}
            {product.scanFeedback.expectedCode}
          </p>
        </div>
      )}

      {showRecommendations && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-cyan-100/80">
                Recomendacion principal
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-100">
                {bestRecommendation?.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {bestRecommendation?.similarityPercent}% similitud
                {bestRecommendation?.price ? ` / ${formatPrice(bestRecommendation.price)}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onViewRecommendations?.(product.id)}
              className="shrink-0 rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Ver alternativas
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default ProductCard;
