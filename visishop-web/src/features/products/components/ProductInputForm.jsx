import { useState } from "react";
import VoiceInputButton from "./VoiceInputButton";

function ProductInputForm({ onAddProduct, isVoiceOnboardingActive = false }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const nextName = name.trim();

    if (!nextName) {
      setMessage("Completa el nombre para agregar el producto.");
      return;
    }

    const createdProduct = onAddProduct(nextName);
    setName("");

    if (createdProduct?.availabilityStatus === "unavailable") {
      setMessage("Producto sin disponibilidad. Se sugirieron alternativas.");
      return;
    }

    setMessage("Producto agregado correctamente.");
  }

  function handleVoiceTranscript(transcript) {
    setName(transcript);
    setMessage("Nombre completado por voz. Ya podes guardar el producto.");
  }

  return (
    <div className="space-y-3">
      <form className="group grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre del producto"
          className="w-full rounded-2xl border border-white/20 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 outline-none transition duration-300 placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 group-hover:border-white/30"
        />
        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-r from-cyan-300 to-teal-300 px-4 py-3 text-sm font-semibold text-slate-900 transition duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
        >
          Guardar
        </button>
      </form>

      <div
        className={[
          "rounded-3xl transition",
          isVoiceOnboardingActive
            ? "ring-2 ring-cyan-200/80 ring-offset-2 ring-offset-slate-950"
            : "",
        ].join(" ")}
      >
        <VoiceInputButton onTranscript={handleVoiceTranscript} />
      </div>

      {message && (
        <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
          {message}
        </p>
      )}
    </div>
  );
}

export default ProductInputForm;
