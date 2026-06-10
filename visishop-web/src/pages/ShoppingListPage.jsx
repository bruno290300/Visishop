import { useEffect, useRef, useState } from "react";
import AppLogo from "../components/common/AppLogo";
import ConfirmModal from "../components/common/ConfirmModal";
import BarcodeScannerModal from "../features/barcode/components/BarcodeScannerModal";
import ProductInputForm from "../features/products/components/ProductInputForm";
import ProductList from "../features/products/components/ProductList";
import RecommendationModal from "../features/products/components/RecommendationModal";
import VoiceOnboarding from "../features/onboarding/components/VoiceOnboarding";
import { useAuth } from "../store/AuthContext";
import { useShoppingList } from "../store/ShoppingListContext";

function ShoppingListPage() {
  const {
    products,
    addProduct,
    clearProducts,
    removeProduct,
    restoreProduct,
    startProductScan,
    cancelProductScan,
    verifyScannedProduct,
    replaceProductWithRecommendation,
  } = useShoppingList();
  const { currentUser, logout } = useAuth();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [scannerProductId, setScannerProductId] = useState(null);
  const [recommendationProductId, setRecommendationProductId] = useState(null);
  const [onboardingTarget, setOnboardingTarget] = useState(null);
  const [recentlyRemovedProduct, setRecentlyRemovedProduct] = useState(null);
  const undoRemovalTimeoutRef = useRef(null);
  const verifiedCount = products.filter((product) => product.status === "verified").length;
  const pendingCount = products.length - verifiedCount;
  const progress = products.length ? Math.round((verifiedCount / products.length) * 100) : 0;
  const scannerProduct = products.find((product) => product.id === scannerProductId) || null;
  const recommendationProduct =
    products.find((product) => product.id === recommendationProductId) || null;

  useEffect(() => {
    return () => {
      if (undoRemovalTimeoutRef.current) {
        window.clearTimeout(undoRemovalTimeoutRef.current);
      }
    };
  }, []);

  function queueUndoRemoval(product, index) {
    if (undoRemovalTimeoutRef.current) {
      window.clearTimeout(undoRemovalTimeoutRef.current);
    }

    setRecentlyRemovedProduct({ product, index });
    undoRemovalTimeoutRef.current = window.setTimeout(() => {
      setRecentlyRemovedProduct(null);
      undoRemovalTimeoutRef.current = null;
    }, 5000);
  }

  function handleOpenClearModal() {
    if (!products.length) return;
    setIsClearModalOpen(true);
  }

  function handleCloseClearModal() {
    setIsClearModalOpen(false);
  }

  function handleConfirmClear() {
    clearProducts();
    setIsClearModalOpen(false);
    setRecentlyRemovedProduct(null);
    if (undoRemovalTimeoutRef.current) {
      window.clearTimeout(undoRemovalTimeoutRef.current);
      undoRemovalTimeoutRef.current = null;
    }
  }

  function handleRemoveProduct(productId) {
    const productIndex = products.findIndex((product) => product.id === productId);
    if (productIndex === -1) return;

    const product = products[productIndex];
    removeProduct(productId);
    queueUndoRemoval(product, productIndex);

    if (scannerProductId === productId) {
      setScannerProductId(null);
    }
    if (recommendationProductId === productId) {
      setRecommendationProductId(null);
    }
  }

  function handleUndoRemoveProduct() {
    if (!recentlyRemovedProduct) return;

    restoreProduct(recentlyRemovedProduct.product, recentlyRemovedProduct.index);
    setRecentlyRemovedProduct(null);
    if (undoRemovalTimeoutRef.current) {
      window.clearTimeout(undoRemovalTimeoutRef.current);
      undoRemovalTimeoutRef.current = null;
    }
  }

  function handleScanRequest(productId) {
    startProductScan(productId);
    setScannerProductId(productId);
  }

  function handleScannerClose() {
    if (scannerProductId) {
      cancelProductScan(scannerProductId);
    }
    setScannerProductId(null);
  }

  function handleScannerSuccess(scannedCode) {
    if (!scannerProductId) return;
    verifyScannedProduct(scannerProductId, scannedCode);
    setScannerProductId(null);
  }

  function handleOpenRecommendations(productId) {
    setRecommendationProductId(productId);
  }

  function handleCloseRecommendations() {
    setRecommendationProductId(null);
  }

  function handleChooseRecommendation(productId, recommendation) {
    replaceProductWithRecommendation(productId, recommendation);
    setRecommendationProductId(null);
  }

  function getOnboardingHighlightClass(targets) {
    const targetList = Array.isArray(targets) ? targets : [targets];
    if (!targetList.includes(onboardingTarget)) return "";

    return "relative z-20 ring-2 ring-cyan-200/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_34px_rgba(34,211,238,0.32)]";
  }

  return (
    <div className="shopping-shell min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <main className="app-shell w-full rounded-[2rem] border border-white/20 bg-slate-950/65 p-4 shadow-2xl shadow-slate-950/60 backdrop-blur-xl sm:p-6">
          <header
            className={[
              "app-block mb-4 rounded-3xl p-5 transition",
              getOnboardingHighlightClass("summary"),
            ].join(" ")}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <AppLogo size="sm" className="mb-2" />
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Lista de compras
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  {verifiedCount} verificados de {products.length} productos.
                </p>
                <p className="mt-1 text-xs text-cyan-100/80">
                  Sesión: {currentUser?.name || "Usuario"}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:flex-nowrap sm:items-start">
                <VoiceOnboarding
                  userId={currentUser?.id || currentUser?.name || "guest"}
                  onActiveTargetChange={setOnboardingTarget}
                />
                <button
                  type="button"
                  onClick={logout}
                  className="min-w-0 flex-1 rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300/20 sm:flex-none"
                >
                  Log out
                </button>
                <button
                  type="button"
                  onClick={handleOpenClearModal}
                  disabled={!products.length}
                  className={[
                    "min-w-0 flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition sm:flex-none",
                    products.length
                      ? "border-red-300/35 bg-red-300/10 text-red-100 hover:bg-red-300/20"
                      : "cursor-not-allowed border-white/15 bg-white/5 text-slate-500",
                  ].join(" ")}
                >
                  Limpiar lista
                </button>
                <div className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-left sm:w-auto sm:min-w-[96px] sm:text-right">
                  <p className="text-[0.65rem] uppercase tracking-[0.14em] text-slate-400">Progreso</p>
                  <p className="text-lg font-semibold text-cyan-100">{progress}%</p>
                </div>
              </div>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-teal-300 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2">
                <p className="text-[0.68rem] uppercase tracking-[0.14em] text-emerald-100/80">
                  Verificados
                </p>
                <p className="text-lg font-semibold text-emerald-100">{verifiedCount}</p>
              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2">
                <p className="text-[0.68rem] uppercase tracking-[0.14em] text-amber-100/80">
                  Pendientes
                </p>
                <p className="text-lg font-semibold text-amber-100">{pendingCount}</p>
              </div>
            </div>
          </header>

          <section
            className={[
              "app-block mb-4 space-y-3 rounded-3xl p-4 transition sm:p-5",
              getOnboardingHighlightClass("add-product"),
            ].join(" ")}
          >
            <ProductInputForm
              onAddProduct={addProduct}
              isVoiceOnboardingActive={onboardingTarget === "voice-input"}
            />
          </section>

          <ProductList
            products={products}
            onScan={handleScanRequest}
            onRemove={handleRemoveProduct}
            onViewRecommendations={handleOpenRecommendations}
            className={getOnboardingHighlightClass(["product-list", "recommendations"])}
          />
        </main>
      </div>

      <ConfirmModal
        open={isClearModalOpen}
        title="Limpiar lista completa"
        description="Se eliminaran todos los productos guardados. Esta accion no se puede deshacer."
        confirmLabel="Si, limpiar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmClear}
        onCancel={handleCloseClearModal}
      />

      <BarcodeScannerModal
        open={Boolean(scannerProduct)}
        productName={scannerProduct?.name || ""}
        expectedCode={scannerProduct?.barcode || ""}
        onClose={handleScannerClose}
        onScanSuccess={handleScannerSuccess}
      />

      <RecommendationModal
        open={Boolean(recommendationProduct)}
        product={recommendationProduct}
        onClose={handleCloseRecommendations}
        onChoose={handleChooseRecommendation}
      />

      {recentlyRemovedProduct && (
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-white/15 bg-slate-950/95 px-4 py-3 text-sm text-slate-100 shadow-2xl shadow-slate-950/60 backdrop-blur">
          <span className="min-w-0 truncate">
            {recentlyRemovedProduct.product.name} eliminado.
          </span>
          <button
            type="button"
            onClick={handleUndoRemoveProduct}
            className="shrink-0 rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300/20"
          >
            Deshacer
          </button>
        </div>
      )}
    </div>
  );
}

export default ShoppingListPage;
