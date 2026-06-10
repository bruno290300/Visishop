import { useEffect, useMemo, useState } from "react";
import { speakFeedback, stopFeedback } from "../../accessibility/services/speechFeedback";

const STORAGE_KEY = "visishop.voiceOnboarding.completed.v1";

const onboardingSteps = [
  {
    target: "summary",
    title: "Estado de tu compra",
    body: "Aca ves quien esta usando la sesion, cuantos productos ya fueron verificados y el progreso general de la lista.",
    speech:
      "Este es el resumen de tu lista. Te muestra cuantos productos ya verificaste y cuantos siguen pendientes.",
  },
  {
    target: "add-product",
    title: "Agregar productos",
    body: "Escribi el nombre del producto y guardalo. Si preferis, tambien podes dictarlo con el boton de voz.",
    speech:
      "Para agregar un producto, escribi el nombre y toca guardar. Tambien podes usar agregar por voz para dictarlo.",
  },
  {
    target: "voice-input",
    title: "Entrada por voz",
    body: "El dictado ayuda a cargar productos mas rapido y reduce errores si el usuario no quiere escribir.",
    speech:
      "El boton agregar por voz activa el microfono y completa el nombre detectado automaticamente.",
  },
  {
    target: "product-list",
    title: "Lista y verificacion",
    body: "Cada producto queda pendiente hasta que se escanea su codigo. Si el codigo coincide, pasa a verificado.",
    speech:
      "En la lista vas a ver los productos pendientes. Toca escanear para comparar el codigo del producto real con el esperado.",
  },
  {
    target: "recommendations",
    title: "Alternativas",
    body: "Cuando un producto no esta disponible o no coincide, Visishop puede mostrar alternativas similares.",
    speech:
      "Si un producto no esta disponible o no coincide, Visishop puede sugerirte alternativas parecidas.",
  },
];

function readCompleted(userId) {
  if (typeof window === "undefined" || !userId) return false;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const completedByUser = raw ? JSON.parse(raw) : {};
    return Boolean(completedByUser[userId]);
  } catch {
    return false;
  }
}

function writeCompleted(userId) {
  if (typeof window === "undefined" || !userId) return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const completedByUser = raw ? JSON.parse(raw) : {};
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...completedByUser,
        [userId]: new Date().toISOString(),
      })
    );
  } catch {
    // localStorage can fail in private mode. The guide still works for this session.
  }
}

function VoiceOnboarding({ userId, onActiveTargetChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeStep = onboardingSteps[activeIndex];
  const isLastStep = activeIndex === onboardingSteps.length - 1;
  const progressLabel = `${activeIndex + 1} de ${onboardingSteps.length}`;

  const hasCompleted = useMemo(() => readCompleted(userId), [userId]);

  useEffect(() => {
    if (!userId || hasCompleted) return;
    setIsOpen(true);
    setIsMinimized(false);
  }, [hasCompleted, userId]);

  useEffect(() => {
    onActiveTargetChange?.(hasStarted && isOpen ? activeStep.target : null);
  }, [activeStep.target, hasStarted, isOpen, onActiveTargetChange]);

  useEffect(() => {
    if (!hasStarted || !isOpen) return;
    speakFeedback(activeStep.speech);
  }, [activeStep, hasStarted, isOpen]);

  useEffect(() => {
    return () => {
      stopFeedback();
      onActiveTargetChange?.(null);
    };
  }, [onActiveTargetChange]);

  function startGuide() {
    setActiveIndex(0);
    setHasStarted(true);
    setIsOpen(true);
    setIsMinimized(false);
  }

  function openGuide() {
    setActiveIndex(0);
    setHasStarted(true);
    setIsOpen(true);
    setIsMinimized(false);
  }

  function closeGuide({ complete = false } = {}) {
    stopFeedback();
    if (complete) {
      writeCompleted(userId);
    }
    setIsOpen(false);
    setHasStarted(false);
    setIsMinimized(false);
    setActiveIndex(0);
    onActiveTargetChange?.(null);
  }

  function minimizeGuide() {
    setIsMinimized(true);
  }

  function restoreGuide() {
    setIsMinimized(false);
  }

  function replayStep() {
    speakFeedback(activeStep.speech);
  }

  function goPrevious() {
    setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }

  function goNext() {
    if (isLastStep) {
      closeGuide({ complete: true });
      return;
    }
    setActiveIndex((currentIndex) => Math.min(currentIndex + 1, onboardingSteps.length - 1));
  }

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={openGuide}
          className="rounded-2xl border border-violet-200/35 bg-violet-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-violet-100 transition hover:bg-violet-300/20"
        >
          Guia por voz
        </button>
      )}

      {isOpen && isMinimized && (
        <button
          type="button"
          onClick={restoreGuide}
          className="fixed bottom-4 right-4 z-50 rounded-2xl border border-cyan-200/40 bg-slate-950/95 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100 shadow-2xl shadow-slate-950/60 backdrop-blur-xl transition hover:bg-cyan-300/15"
        >
          Guia
        </button>
      )}

      {isOpen && !isMinimized && (
        <div className="fixed inset-x-0 bottom-3 z-50 px-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[360px] sm:px-0">
          <div className="rounded-3xl border border-white/20 bg-slate-950/95 p-4 shadow-2xl shadow-slate-950/70 backdrop-blur-xl">
            {!hasStarted ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                    Onboarding guiado
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    Aprende Visishop con asistencia por voz
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    La guia te acompana por las funciones principales: resumen,
                    carga por texto o voz, verificacion por codigo y alternativas.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={startGuide}
                    className="rounded-2xl bg-gradient-to-r from-cyan-300 to-teal-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                  >
                    Comenzar
                  </button>
                  <button
                    type="button"
                    onClick={() => closeGuide({ complete: true })}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    Omitir
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                      Paso {progressLabel}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">{activeStep.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{activeStep.body}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={minimizeGuide}
                      className="rounded-xl border border-white/15 bg-white/5 px-2.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      Minimizar
                    </button>
                    <button
                      type="button"
                      onClick={() => closeGuide()}
                      className="rounded-xl border border-white/15 bg-white/5 px-2.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-teal-300 to-violet-300 transition-all duration-500"
                    style={{ width: `${((activeIndex + 1) / onboardingSteps.length) * 100}%` }}
                  />
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={replayStep}
                    className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                  >
                    Escuchar otra vez
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={goPrevious}
                      disabled={activeIndex === 0}
                      className={[
                        "rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
                        activeIndex === 0
                          ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                          : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10",
                      ].join(" ")}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="rounded-2xl bg-gradient-to-r from-cyan-300 to-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                    >
                      {isLastStep ? "Finalizar" : "Siguiente"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default VoiceOnboarding;
