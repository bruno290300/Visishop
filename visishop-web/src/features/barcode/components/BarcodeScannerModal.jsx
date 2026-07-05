import { useEffect, useMemo, useRef, useState } from "react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
];

const SCAN_FPS = 15;
const SCANNER_ASPECT_RATIO = 16 / 9;
const SAFE_CAMERA_CONSTRAINTS = { facingMode: "environment" };
const POST_START_VIDEO_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 30 },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBarcodeQrbox(viewfinderWidth, viewfinderHeight) {
  const safeWidth = Math.max(120, viewfinderWidth - 24);
  const safeHeight = Math.max(120, viewfinderHeight - 24);
  const width = clamp(
    Math.floor(viewfinderWidth * 0.96),
    240,
    Math.min(720, safeWidth)
  );
  const height = clamp(
    Math.floor(viewfinderHeight * 0.42),
    130,
    Math.min(260, safeHeight)
  );

  return { width, height };
}

function getCameraErrorMessage(err) {
  const detail = err?.name ? ` (${err.name})` : "";
  const message = typeof err === "string" ? err : err?.message;

  if (err?.name === "NotAllowedError") {
    return `El navegador bloqueo la camara${detail}. Revisa que el permiso este permitido para este sitio.`;
  }
  if (err?.name === "NotFoundError") {
    return `No se detecto ninguna camara disponible${detail}.`;
  }
  if (err?.name === "NotReadableError") {
    return `La camara esta ocupada por otra app o pestana${detail}. Cerrala y vuelve a intentar.`;
  }
  if (err?.name === "OverconstrainedError") {
    return `La camara no acepta la configuracion solicitada${detail}. Intenta cerrar y abrir el escaner otra vez.`;
  }

  return (
    (message ? `${message}${detail}` : "") ||
    "No se pudo iniciar la camara. Revisa permisos del navegador."
  );
}

async function applyVideoOptimizations(scanner) {
  try {
    await scanner.applyVideoConstraints(POST_START_VIDEO_CONSTRAINTS);
  } catch {
    // Si el celular no acepta 720p/30fps, seguimos con la camara ya abierta.
  }
}

function BarcodeScannerModal({
  open,
  productName,
  expectedCode,
  onClose,
  onScanSuccess,
}) {
  const [status, setStatus] = useState("Iniciando camara...");
  const [error, setError] = useState("");
  const onScanSuccessRef = useRef(onScanSuccess);
  const scannerId = useMemo(
    () => `barcode-reader-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    let hasScanned = false;
    const scanner = new Html5Qrcode(scannerId);
    const isSecure =
      window.isSecureContext ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    async function stopScanner() {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch {
        // no-op
      }
      try {
        await scanner.clear();
      } catch {
        // no-op
      }
    }

    async function startScanner() {
      try {
        if (!isMounted) return;

        if (!isSecure) {
          setError(
            "Camara bloqueada: abre la app en HTTPS o localhost para habilitar permisos."
          );
          setStatus("Contexto no seguro.");
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Este navegador no permite acceso a camara.");
          setStatus("Camara no soportada.");
          return;
        }

        setStatus("Solicitando permisos de camara...");
        setError("");

        const scannerConfig = {
          fps: SCAN_FPS,
          qrbox: getBarcodeQrbox,
          aspectRatio: SCANNER_ASPECT_RATIO,
          formatsToSupport: SUPPORTED_FORMATS,
        };

        const onSuccess = async (decodedText) => {
          if (!isMounted || hasScanned) return;
          hasScanned = true;
          setStatus("Codigo detectado. Verificando...");
          await stopScanner();
          onScanSuccessRef.current(String(decodedText || "").trim());
        };

        const onFailure = () => {
          // lectura continua
        };

        setStatus("Iniciando camara trasera...");
        await scanner.start(
          SAFE_CAMERA_CONSTRAINTS,
          scannerConfig,
          onSuccess,
          onFailure
        );

        if (isMounted) {
          await applyVideoOptimizations(scanner);
          setStatus("Enfoca el codigo de barras dentro del recuadro grande.");
        }
      } catch (err) {
        if (!isMounted) return;
        setError(getCameraErrorMessage(err));
        setStatus("Camara no disponible.");
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [open, scannerId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="modal-enter w-full max-w-lg rounded-3xl border border-white/20 bg-slate-900/95 p-4 shadow-2xl shadow-slate-950/70 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200/75">
              Escaneo activo
            </p>
            <h2 className="text-lg font-semibold text-white">{productName}</h2>
            <p className="mt-1 text-xs font-mono text-slate-400">
              Esperado: {expectedCode}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/60 p-2">
          <div id={scannerId} className="min-h-[260px] w-full" />
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-300">{status}</p>
          {error && (
            <div className="rounded-xl border border-red-300/35 bg-red-400/10 px-3 py-2 text-xs text-red-100">
              {error}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default BarcodeScannerModal;
