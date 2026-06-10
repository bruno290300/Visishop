import catalog from "../../../data/productCatalog.json";

const DEFAULT_RECOMMENDATION_LIMIT = 3;
const MIN_RECOMMENDATION_SCORE = 35;

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

function toTokenSet(value) {
  return new Set(normalizeText(value).split(" ").filter(Boolean));
}

function sameText(left, right) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function countTokenOverlap(leftTokens, rightTokens) {
  return [...leftTokens].filter((token) => rightTokens.has(token)).length;
}

function getSizeScore(referenceProduct, candidateProduct) {
  const referenceSize = referenceProduct?.size;
  const candidateSize = candidateProduct?.size;

  if (!referenceSize?.value || !candidateSize?.value) return 0;
  if (!sameText(referenceSize.unit, candidateSize.unit)) return 0;

  const referenceValue = Number(referenceSize.value);
  const candidateValue = Number(candidateSize.value);
  if (!Number.isFinite(referenceValue) || !Number.isFinite(candidateValue)) return 0;

  const difference = Math.abs(referenceValue - candidateValue);
  const maxValue = Math.max(referenceValue, candidateValue, 1);
  const similarity = 1 - Math.min(difference / maxValue, 1);

  return Math.round(similarity * 40);
}

function getPriceScore(referenceProduct, candidateProduct) {
  const referencePrice = Number(referenceProduct?.price);
  const candidatePrice = Number(candidateProduct?.price);

  if (!Number.isFinite(referencePrice) || !Number.isFinite(candidatePrice)) return 0;
  if (candidatePrice <= referencePrice) return 8;

  const difference = candidatePrice - referencePrice;
  const tolerance = Math.max(referencePrice * 0.2, 1);
  return difference <= tolerance ? 4 : 0;
}

function isSameCatalogProduct(left, right) {
  return Boolean(left?.barcode && right?.barcode && left.barcode === right.barcode);
}

function scoreRecommendation(referenceProduct, candidateProduct, queryTokens) {
  if (!isCatalogProductAvailable(candidateProduct)) return 0;
  if (isSameCatalogProduct(referenceProduct, candidateProduct)) return 0;

  const candidateTokens = toTokenSet(candidateProduct.name);
  const queryOverlap = countTokenOverlap(queryTokens, candidateTokens);
  let score = queryOverlap * 8;

  if (!referenceProduct) {
    return queryOverlap > 0 ? score + queryOverlap * 35 : 0;
  }

  if (sameText(referenceProduct.category, candidateProduct.category)) score += 60;
  if (sameText(referenceProduct.type, candidateProduct.type)) score += 70;
  if (sameText(referenceProduct.brand, candidateProduct.brand)) score += 20;
  if (sameText(referenceProduct.variant, candidateProduct.variant)) score += 8;

  score += getSizeScore(referenceProduct, candidateProduct);
  score += getPriceScore(referenceProduct, candidateProduct);

  return score;
}

function buildRecommendationReason(referenceProduct, candidateProduct) {
  const reasons = buildRecommendationCriteria(referenceProduct, candidateProduct);

  return reasons.length ? reasons.slice(0, 3).join(", ") : "producto relacionado";
}

function buildRecommendationCriteria(referenceProduct, candidateProduct) {
  const criteria = [];

  if (sameText(referenceProduct?.type, candidateProduct.type)) {
    criteria.push("mismo tipo");
  }

  if (sameText(referenceProduct?.category, candidateProduct.category)) {
    criteria.push("misma categoria");
  }

  if (sameText(referenceProduct?.brand, candidateProduct.brand)) {
    criteria.push("misma marca");
  }

  if (getSizeScore(referenceProduct, candidateProduct) >= 28) {
    criteria.push("presentacion similar");
  }

  if (getPriceScore(referenceProduct, candidateProduct) >= 8) {
    criteria.push("precio menor o similar");
  }

  return criteria;
}

function toSimilarityPercent(score) {
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.min(98, Math.max(45, Math.round((score / 230) * 100)));
}

export function isCatalogProductAvailable(product) {
  return product?.available !== false;
}

export function toRecommendationProduct(product) {
  if (!product) return null;

  return {
    name: product.name,
    barcode: product.barcode,
    category: product.category || "",
    type: product.type || "",
    brand: product.brand || "",
    variant: product.variant || "",
    size: product.size || null,
    price: product.price ?? null,
    available: isCatalogProductAvailable(product),
  };
}

export function findBestCatalogMatch(name) {
  const normalized = normalizeText(name);
  if (!normalized) return null;

  const inputTokens = toTokenSet(normalized);
  if (!inputTokens.size) return null;

  let best = null;
  let bestScore = 0;
  let tie = false;
  let bestIsDefault = false;

  for (const item of catalog) {
    const productNormalized = normalizeText(item.name);
    if (!productNormalized) continue;

    let score = 0;
    if (productNormalized === normalized) {
      score = 10000;
    } else {
      const productTokens = toTokenSet(productNormalized);
      const overlap = countTokenOverlap(inputTokens, productTokens);
      if (overlap === 0) {
        score = 0;
      } else {
        const extrasProduct = [...productTokens].filter((t) => !inputTokens.has(t)).length;
        const extrasInput = [...inputTokens].filter((t) => !productTokens.has(t)).length;

        score = overlap * 100 - extrasProduct * 10 - extrasInput * 5;

        const coverage = overlap / Math.max(productTokens.size, 1);
        if (coverage >= 0.6) score += 40;

        if (normalized.includes(productNormalized) || productNormalized.includes(normalized)) {
          score += 50;
        }
      }
    }

    if (item.default) score += 5;
    if (isCatalogProductAvailable(item)) score += 2;

    if (score <= 0) continue;

    const isDefault = Boolean(item.default);

    if (score > bestScore) {
      best = item;
      bestScore = score;
      tie = false;
      bestIsDefault = isDefault;
    } else if (score === bestScore) {
      if (isDefault && !bestIsDefault) {
        best = item;
        bestIsDefault = true;
        tie = false;
      } else if (!isDefault && bestIsDefault) {
        tie = false;
      } else {
        tie = true;
      }
    }
  }

  return !best || tie ? null : best;
}

export function getCatalogCount() {
  return catalog.length;
}

export function findCatalogProductByBarcode(barcode) {
  const normalizedBarcode = String(barcode || "").trim().replace(/\s/g, "");
  if (!normalizedBarcode) return null;

  return (
    catalog.find(
      (item) => String(item.barcode || "").trim().replace(/\s/g, "") === normalizedBarcode
    ) || null
  );
}

export function getCatalogProductAvailability(productOrName) {
  const catalogProduct =
    typeof productOrName === "string"
      ? findBestCatalogMatch(productOrName)
      : productOrName;

  if (!catalogProduct) {
    return {
      product: null,
      status: "unknown",
      isAvailable: true,
    };
  }

  const isAvailable = isCatalogProductAvailable(catalogProduct);

  return {
    product: catalogProduct,
    status: isAvailable ? "available" : "unavailable",
    isAvailable,
  };
}

export function getProductRecommendations(productOrName, options = {}) {
  const limit = options.limit || DEFAULT_RECOMMENDATION_LIMIT;
  const referenceProduct =
    typeof productOrName === "string"
      ? findBestCatalogMatch(productOrName)
      : productOrName;
  const queryName =
    typeof productOrName === "string"
      ? productOrName
      : productOrName?.name || "";
  const queryTokens = toTokenSet(queryName || referenceProduct?.name || "");

  return catalog
    .map((candidate) => ({
      product: candidate,
      score: scoreRecommendation(referenceProduct, candidate, queryTokens),
    }))
    .filter((item) => item.score >= MIN_RECOMMENDATION_SCORE)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return Number(left.product.price || 0) - Number(right.product.price || 0);
    })
    .slice(0, limit)
    .map(({ product, score }) => ({
      ...toRecommendationProduct(product),
      score,
      similarityPercent: toSimilarityPercent(score),
      criteria: buildRecommendationCriteria(referenceProduct, product),
      reason: buildRecommendationReason(referenceProduct, product),
    }));
}
