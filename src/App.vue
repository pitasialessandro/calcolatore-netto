<script setup lang="ts">
import { ref } from "vue";
import { calcola, aliquotaMarginale, type Risultato } from "./calcolo";

const ral = ref(35_000);
const mensilita = ref(13);
const vista = ref<"annuale" | "mensile">("annuale");
const risultato = ref<Risultato | null>(null);
const marginale = ref(0);
const animato = ref(false);
const nettoAnim = ref(0);

const motoRidotto = matchMedia("(prefers-reduced-motion: reduce)");

// conteggio progressivo verso il valore, easeOutCubic
function contaVerso(target: number, durata = 900) {
  const da = nettoAnim.value;
  if (motoRidotto.matches) return void (nettoAnim.value = target);

  const inizio = performance.now();
  const step = (t: number) => {
    const p = Math.min((t - inizio) / durata, 1);
    nettoAnim.value = da + (target - da) * (1 - (1 - p) ** 3);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const eur = (n: number) =>
  (n / (vista.value === "mensile" ? mensilita.value : 1)).toLocaleString(
    "it-IT",
    {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    },
  );

const pct = (n: number) =>
  (n * 100).toLocaleString("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "%";

// larghezza barra: quota sulla RAL, invariante rispetto alla vista
const quota = (n: number) => (n / (risultato.value?.ral || 1)) * 100 + "%";

function esegui() {
  risultato.value = calcola(ral.value, mensilita.value);
  marginale.value = aliquotaMarginale(ral.value);
  contaVerso(risultato.value.nettoAnnuo);

  // due frame: il primo dipinge le barre a zero, il secondo fa partire la transizione
  animato.value = false;
  requestAnimationFrame(() => requestAnimationFrame(() => (animato.value = true)));
}
</script>

<template>
  <main class="min-h-screen bg-white text-neutral-900">
    <div class="mx-auto max-w-2xl px-6 py-16">
      <h1 class="text-xs uppercase tracking-[0.2em] text-neutral-400">
        Da RAL a netto
      </h1>

      <div
        class="mt-8 flex flex-wrap items-end gap-6 border-b border-neutral-200 pb-10"
      >
        <label class="flex flex-col gap-2">
          <span class="text-xs uppercase tracking-widest text-neutral-500">
            RAL annua
          </span>
          <input
            v-model.number="ral"
            type="number"
            step="1000"
            class="w-40 border border-neutral-300 px-3 py-2 tabular-nums outline-none focus:border-neutral-900"
            @keyup.enter="esegui"
          />
        </label>

        <label class="flex flex-col gap-2">
          <span class="text-xs uppercase tracking-widest text-neutral-500">
            Mensilità
          </span>
          <select
            v-model.number="mensilita"
            class="border border-neutral-300 bg-white px-3 py-2 tabular-nums outline-none focus:border-neutral-900"
          >
            <option :value="12">12</option>
            <option :value="13">13</option>
            <option :value="14">14</option>
          </select>
        </label>

        <button
          class="bg-neutral-900 px-8 py-2 text-sm uppercase tracking-widest text-white transition-opacity hover:opacity-80"
          @click="esegui"
        >
          Calcola
        </button>
      </div>

      <section v-if="risultato" class="mt-12">
        <div class="flex gap-8 text-xs uppercase tracking-widest">
          <button
            :class="
              vista === 'annuale'
                ? 'border-b border-neutral-900 pb-1 text-neutral-900'
                : 'pb-1 text-neutral-400 hover:text-neutral-600'
            "
            @click="vista = 'annuale'"
          >
            Annuale
          </button>
          <button
            :class="
              vista === 'mensile'
                ? 'border-b border-neutral-900 pb-1 text-neutral-900'
                : 'pb-1 text-neutral-400 hover:text-neutral-600'
            "
            @click="vista = 'mensile'"
          >
            Mensile
          </button>
        </div>

        <p class="mt-10 text-6xl font-light tabular-nums tracking-tight">
          {{ eur(nettoAnim) }}
        </p>
        <p class="mt-3 text-sm text-neutral-500">
          netto {{ vista }}<template v-if="vista === 'mensile'">
            · {{ mensilita }} mensilità</template
          >
          · aliquota effettiva
          <span class="text-neutral-900">
            {{ pct(risultato.aliquotaEffettiva) }}
          </span>
        </p>

        <div class="mt-14 space-y-3">
          <div
            class="grid grid-cols-[1fr_7rem_7rem] items-center gap-4 border-b border-neutral-200 pb-3"
          >
            <span class="text-sm">{{
              vista === "annuale" ? "RAL" : "Lordo mensile"
            }}</span>
            <span class="h-1.5 bg-neutral-900"></span>
            <span class="text-right tabular-nums">{{ eur(risultato.ral) }}</span>
          </div>

          <template v-for="(voce, i) in risultato.voci" :key="voce.label">
            <div class="grid grid-cols-[1fr_7rem_7rem] items-center gap-4">
              <span class="text-sm">{{ voce.label }}</span>
              <span class="h-1.5 bg-neutral-100">
                <span
                  class="block h-full transition-[width] duration-700 ease-out"
                  :class="
                    voce.segno === '+'
                      ? 'border border-neutral-900'
                      : 'bg-neutral-900'
                  "
                  :style="{
                    width: animato ? quota(voce.importo) : '0%',
                    transitionDelay: 80 * (i + 1) + 'ms',
                  }"
                ></span>
              </span>
              <span class="text-right tabular-nums">
                {{ voce.segno }} {{ eur(voce.importo) }}
              </span>
            </div>

            <div
              v-for="d in voce.dettaglio ?? []"
              :key="d.label"
              class="grid grid-cols-[1fr_7rem_7rem] items-center gap-4 text-sm text-neutral-500"
            >
              <span class="pl-6">{{ d.label }} su {{ eur(d.base!) }}</span>
              <span></span>
              <span class="text-right tabular-nums">{{ eur(d.importo) }}</span>
            </div>
          </template>

          <div
            class="grid grid-cols-[1fr_7rem_7rem] items-center gap-4 border-t border-neutral-900 pt-3"
          >
            <span class="text-sm">Netto {{ vista }}</span>
            <span class="h-1.5 bg-neutral-100">
              <span
                class="block h-full bg-neutral-900 transition-[width] duration-700 ease-out"
                :style="{
                  width: animato ? quota(risultato.nettoAnnuo) : '0%',
                  transitionDelay: 80 * (risultato.voci.length + 1) + 'ms',
                }"
              ></span>
            </span>
            <span class="text-right tabular-nums">
              {{ eur(risultato.nettoAnnuo) }}
            </span>
          </div>
        </div>

        <p class="mt-12 text-xs text-neutral-500">
          Aliquota marginale
          <span class="tabular-nums text-neutral-900">
            {{ pct(marginale) }}
          </span>
          — quanto dei prossimi 100 € di RAL non arriva in busta.
        </p>

        <details class="mt-6 text-xs text-neutral-500">
          <summary class="cursor-pointer select-none hover:text-neutral-900">
            Assunzioni e semplificazioni
          </summary>
          <ul class="mt-4 list-disc space-y-2 pl-4 leading-relaxed">
            <li>
              Dipendente a tempo indeterminato, anno intero, residente a Milano.
              Nessun familiare a carico e nessuna agevolazione.
            </li>
            <li>
              INPS al 9,19%, più l'1% sulla quota oltre la prima fascia
              pensionabile (56.224 € nel 2026). Non applicato il massimale
              contributivo di 122.295 €, che rileva solo oltre quella RAL.
            </li>
            <li>
              Netto mensile = netto annuo diviso le mensilità. Nella realtà la
              tredicesima è tassata senza detrazioni, quindi è più bassa di una
              mensilità ordinaria.
            </li>
            <li>
              Nessun conguaglio di fine anno: il calcolo risponde a "quanto resta
              in un anno", non a "com'è la busta di marzo".
            </li>
            <li>
              Trattamento integrativo (ex bonus 100 €) non calcolato. Rileva
              sotto i ~15.000 € di reddito.
            </li>
            <li>
              Non considerati fondi pensione, welfare aziendale, premi di
              risultato a tassazione agevolata e fringe benefit.
            </li>
          </ul>
        </details>
      </section>
    </div>
  </main>
</template>
