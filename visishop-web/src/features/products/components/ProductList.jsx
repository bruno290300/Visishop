import ProductCard from "./ProductCard";

function ProductList({ products, onScan, onRemove, onViewRecommendations, className = "" }) {
  if (!products.length) {
    return (
      <div
        className={[
          "rounded-2xl border border-dashed border-white/25 bg-white/5 p-6 text-center text-sm text-slate-300",
          className,
        ].join(" ")}
      >
        No hay productos todavia. Agrega el primero por texto o voz.
      </div>
    );
  }

  return (
    <div className={["grid gap-3 sm:grid-cols-2", className].join(" ")}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onScan={onScan}
          onRemove={onRemove}
          onViewRecommendations={onViewRecommendations}
        />
      ))}
    </div>
  );
}

export default ProductList;
