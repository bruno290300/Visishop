import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import {
  generateProductBarcode,
} from "../features/barcode/services/mockBarcodeScanner";
import { speakFeedback } from "../features/accessibility/services/speechFeedback";
import {
  findBestCatalogMatch,
  findCatalogProductByBarcode,
  getCatalogProductAvailability,
  getProductRecommendations,
  matchesCatalogProductInput,
  MIN_PRODUCT_ENTRY_MATCH_SCORE,
} from "../features/products/services/productCatalog";

const ShoppingListContext = createContext(null);
const STORAGE_KEY_V1 = "visishop.products.v1";
const STORAGE_KEY_V2 = "visishop.products.v2";

const seedProducts = [];

const initialState = {
  products: seedProducts,
};

function buildRecommendationData(productOrName) {
  return getProductRecommendations(productOrName, { limit: 3 });
}

function findProductEntryCatalogMatch(name, barcode = "") {
  return (
    findCatalogProductByBarcode(barcode) ||
    findBestCatalogMatch(name, {
      minimumScore: MIN_PRODUCT_ENTRY_MATCH_SCORE,
      useDefaultTieBreaker: false,
    })
  );
}

function buildProductData({ name, barcode, status = "pending", catalogProduct = null }) {
  const availability = catalogProduct
    ? getCatalogProductAvailability(catalogProduct)
    : {
        product: null,
        status: "unknown",
        isAvailable: true,
      };
  const sourceProduct = availability.product || catalogProduct || name;

  return {
    name,
    status,
    barcode,
    availabilityStatus: availability.status,
    category: sourceProduct?.category || "",
    type: sourceProduct?.type || "",
    brand: sourceProduct?.brand || "",
    price: sourceProduct?.price ?? null,
    recommendations: buildRecommendationData(sourceProduct),
  };
}

function sanitizeProducts(rawProducts) {
  if (!Array.isArray(rawProducts)) return [];

  const sanitized = rawProducts
    .filter((item) => item && typeof item.name === "string")
    .map((item) => {
      const name = item.name.trim();
      const status = item.status === "verified" ? "verified" : "pending";
      const storedBarcode = String(item.barcode || "").trim();
      const catalogProduct = findProductEntryCatalogMatch(name, storedBarcode);
      const barcode = String(
        catalogProduct?.barcode || storedBarcode || generateProductBarcode(name)
      ).trim();
      const productData = buildProductData({ name, barcode, status, catalogProduct });

      return {
        id: item.id || `prd-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        ...productData,
        isScanning: false,
        scanFeedback: null,
      };
    })
    .filter((item) => item.name.length > 0);

  return sanitized;
}

function getInitialState() {
  if (typeof window === "undefined") return initialState;

  try {
    const serializedV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (serializedV2) {
      const parsed = JSON.parse(serializedV2);
      return { products: sanitizeProducts(parsed.products) };
    }

    const serializedV1 = window.localStorage.getItem(STORAGE_KEY_V1);
    if (!serializedV1) return initialState;

    const parsedV1 = JSON.parse(serializedV1);
    const migratedProducts = sanitizeProducts(parsedV1);
    window.localStorage.setItem(
      STORAGE_KEY_V2,
      JSON.stringify({
        version: 2,
        products: migratedProducts,
        migratedAt: new Date().toISOString(),
      })
    );
    window.localStorage.removeItem(STORAGE_KEY_V1);

    return {
      products: migratedProducts,
    };
  } catch {
    return initialState;
  }
}

function shoppingListReducer(state, action) {
  switch (action.type) {
    case "ADD_PRODUCT": {
      const newProduct = {
        id: `prd-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        ...action.payload.product,
        isScanning: false,
        scanFeedback: null,
      };

      return {
        ...state,
        products: [newProduct, ...state.products],
      };
    }
    case "REPLACE_PRODUCT":
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.payload.id
            ? {
                ...product,
                ...action.payload.product,
                status: "pending",
                isScanning: false,
                scanFeedback: {
                  type: "success",
                  scannedCode: action.payload.product.barcode,
                  expectedCode: action.payload.product.barcode,
                  message: "Producto reemplazado por una alternativa recomendada.",
                },
              }
            : product
        ),
      };
    case "SCAN_START":
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.payload.id
            ? { ...product, isScanning: true, scanFeedback: null }
            : product
        ),
      };
    case "SCAN_FINISH":
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.payload.id
            ? {
                ...product,
                ...(action.payload.product || {}),
                status: action.payload.isMatch ? "verified" : product.status,
                isScanning: false,
                scanFeedback: {
                  type: action.payload.feedbackType,
                  scannedCode: action.payload.scannedCode,
                  expectedCode: action.payload.expectedCode,
                  message: action.payload.message,
                },
              }
            : product
        ),
      };
    case "SCAN_CANCEL":
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.payload.id
            ? { ...product, isScanning: false }
            : product
        ),
      };
    case "REMOVE_PRODUCT":
      return {
        ...state,
        products: state.products.filter((product) => product.id !== action.payload.id),
      };
    case "RESTORE_PRODUCT": {
      if (state.products.some((product) => product.id === action.payload.product.id)) {
        return state;
      }

      const products = [...state.products];
      const insertIndex = Math.min(
        Math.max(action.payload.index ?? 0, 0),
        products.length
      );
      products.splice(insertIndex, 0, action.payload.product);

      return {
        ...state,
        products,
      };
    }
    case "CLEAR_PRODUCTS":
      return {
        ...state,
        products: [],
      };
    default:
      return state;
  }
}

export function ShoppingListProvider({ children }) {
  const [state, dispatch] = useReducer(shoppingListReducer, initialState, getInitialState);

  function addProduct(payload) {
    const isObjectPayload = payload && typeof payload === "object";
    const requestedName = String(
      isObjectPayload ? payload.name : payload
    ).trim();
    const catalogMatch = findProductEntryCatalogMatch(
      requestedName,
      isObjectPayload ? payload.barcode : ""
    );
    const normalizedName = requestedName;
    const normalizedBarcode = String(
      isObjectPayload
        ? payload.barcode || catalogMatch?.barcode || generateProductBarcode(normalizedName)
        : catalogMatch?.barcode || generateProductBarcode(normalizedName)
    ).trim();
    if (!normalizedName || !normalizedBarcode) return;

    const product = buildProductData({
      name: normalizedName,
      barcode: normalizedBarcode,
      catalogProduct: catalogMatch,
    });

    dispatch({
      type: "ADD_PRODUCT",
      payload: {
        product,
      },
    });

    if (product.availabilityStatus === "unavailable") {
      speakFeedback(`No se encontro disponibilidad para ${product.name}. Se sugieren productos similares.`);
    }

    return product;
  }

  function normalizeCode(rawCode) {
    return String(rawCode || "").trim().replace(/\s/g, "");
  }

  function verifyScannedProduct(id, scannedCode) {
    const targetProduct = state.products.find((product) => product.id === id);
    if (!targetProduct) return;

    const expectedCode = normalizeCode(targetProduct.barcode);
    const receivedCode = normalizeCode(scannedCode);
    const scannedCatalogProduct = findCatalogProductByBarcode(receivedCode);
    const targetCatalogProduct = findProductEntryCatalogMatch(targetProduct.name, expectedCode);
    const isCatalogMatch = Boolean(
      scannedCatalogProduct &&
        ((targetCatalogProduct &&
          scannedCatalogProduct.barcode === targetCatalogProduct.barcode) ||
          matchesCatalogProductInput(scannedCatalogProduct, targetProduct.name))
    );
    const isMatch = expectedCode === receivedCode || isCatalogMatch;
    const verifiedProduct = isMatch && scannedCatalogProduct
      ? buildProductData({
          name: targetProduct.name,
          barcode: scannedCatalogProduct.barcode,
          status: "verified",
          catalogProduct: scannedCatalogProduct,
        })
      : null;
    const feedbackType = isMatch ? "success" : scannedCatalogProduct ? "error" : "warning";
    const message = isMatch
      ? "Codigo verificado correctamente."
      : scannedCatalogProduct
        ? "El codigo no coincide con este producto."
        : "Producto no encontrado.";
    const speechMessage = isMatch
      ? `Producto correcto. ${targetProduct.name} encontrada.`
      : scannedCatalogProduct
        ? "Este producto no coincide con el de la lista."
        : "Producto no encontrado.";

    speakFeedback(speechMessage);

    dispatch({
      type: "SCAN_FINISH",
      payload: {
        id,
        isMatch,
        feedbackType,
        message,
        scannedCode: receivedCode || "sin-codigo",
        expectedCode: verifiedProduct?.barcode || expectedCode,
        product: verifiedProduct,
      },
    });
  }

  function startProductScan(id) {
    dispatch({ type: "SCAN_START", payload: { id } });
  }

  function cancelProductScan(id) {
    dispatch({ type: "SCAN_CANCEL", payload: { id } });
  }

  function clearProducts() {
    dispatch({ type: "CLEAR_PRODUCTS" });
  }

  function removeProduct(id) {
    dispatch({ type: "REMOVE_PRODUCT", payload: { id } });
  }

  function restoreProduct(product, index = 0) {
    if (!product?.id) return;

    dispatch({
      type: "RESTORE_PRODUCT",
      payload: {
        product: {
          ...product,
          isScanning: false,
        },
        index,
      },
    });
  }

  function replaceProductWithRecommendation(id, recommendation) {
    const name = String(recommendation?.name || "").trim();
    const barcode = String(recommendation?.barcode || "").trim();
    if (!name || !barcode) return;

    const catalogProduct = findCatalogProductByBarcode(barcode) || findBestCatalogMatch(name);
    const product = buildProductData({
      name,
      barcode,
      catalogProduct,
    });

    speakFeedback(`Producto reemplazado por ${name}.`);

    dispatch({
      type: "REPLACE_PRODUCT",
      payload: {
        id,
        product,
      },
    });

    return product;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const persistableProducts = state.products.map((product) => ({
      id: product.id,
      name: product.name,
      status: product.status,
      barcode: product.barcode,
      availabilityStatus: product.availabilityStatus,
    }));

    window.localStorage.setItem(
      STORAGE_KEY_V2,
      JSON.stringify({
        version: 2,
        products: persistableProducts,
        updatedAt: new Date().toISOString(),
      })
    );
  }, [state.products]);

  const value = useMemo(
    () => ({
      products: state.products,
      addProduct,
      startProductScan,
      cancelProductScan,
      verifyScannedProduct,
      clearProducts,
      removeProduct,
      restoreProduct,
      replaceProductWithRecommendation,
    }),
    [state.products]
  );

  return (
    <ShoppingListContext.Provider value={value}>
      {children}
    </ShoppingListContext.Provider>
  );
}

export function useShoppingList() {
  const context = useContext(ShoppingListContext);
  if (!context) {
    throw new Error("useShoppingList must be used inside ShoppingListProvider.");
  }
  return context;
}
