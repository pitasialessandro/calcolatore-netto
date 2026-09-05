// src/calcolo.ts — step 1: INPS + IRPEF

export const INPS_ALIQUOTA = 0.0919;

// 1% aggiuntivo sulla quota oltre la prima fascia pensionabile (INPS circ. 6/2026).
export const INPS_PRIMA_FASCIA = 56_224;
export const INPS_ALIQUOTA_AGGIUNTIVA = 0.01;

// 2026: la L. 199/2025 ha ridotto il secondo scaglione dal 35% al 33%.
export const SCAGLIONI_IRPEF = [
  { fino: 28_000, aliquota: 0.23 },
  { fino: 50_000, aliquota: 0.33 },
  { fino: Infinity, aliquota: 0.43 },
];

// Lombardia: 4 scaglioni, art. 72 c.1 L.R. 10/2003 (fonte: Dipartimento delle Finanze).
export const SCAGLIONI_REGIONALE = [
  { fino: 15_000, aliquota: 0.0123 },
  { fino: 28_000, aliquota: 0.0158 },
  { fino: 50_000, aliquota: 0.0172 },
  { fino: Infinity, aliquota: 0.0173 },
];

// Milano: 0,8% piatto, ma esente sotto soglia. Sopra si paga sull'intero
// imponibile, non sull'eccedenza: è uno scalino, non una franchigia.
export const ALIQUOTA_COMUNALE = 0.008;
export const ESENZIONE_COMUNALE = 23_000;

export type Voce = {
  label: string;
  importo: number;
  segno: "−" | "+";
  base?: number; // imponibile su cui è calcolata: lo divide la vista, non il motore
  dettaglio?: Voce[];
};

export type Risultato = {
  ral: number;
  voci: Voce[];
  nettoAnnuo: number;
  aliquotaEffettiva: number;
};

function perScaglioni(
  imponibile: number,
  scaglioni: typeof SCAGLIONI_IRPEF,
): { totale: number; dettaglio: Voce[] } {
  const dettaglio: Voce[] = [];
  let totale = 0;
  let precedente = 0;

  for (const s of scaglioni) {
    const porzione = Math.min(imponibile, s.fino) - precedente;
    if (porzione <= 0) break;

    const imposta = porzione * s.aliquota;
    totale += imposta;
    dettaglio.push({
      label: `${(s.aliquota * 100).toLocaleString("it-IT")}%`,
      importo: imposta,
      segno: "−",
      base: porzione,
    });
    precedente = s.fino;
  }

  return { totale, dettaglio };
}

// Detrazione per lavoro dipendente — art. 13 TUIR.
// Non è una tabella come gli scaglioni: ogni fascia ha una formula di forma diversa.
function detrazioneLavoroDipendente(reddito: number): number {
  let d: number;
  if (reddito <= 15_000) d = 1955;
  else if (reddito <= 28_000) d = 1910 + 1190 * ((28_000 - reddito) / 13_000);
  else if (reddito <= 50_000) d = 1910 * ((50_000 - reddito) / 22_000);
  else return 0;

  if (reddito > 25_000 && reddito <= 35_000) d += 65;

  return d;
}

// Taglio del cuneo fiscale — art. 1 c. 4-9 L. 207/2024, strutturale dal 2025.
function ulterioreDetrazione(reddito: number): number {
  if (reddito <= 20_000 || reddito > 40_000) return 0;
  if (reddito <= 32_000) return 1_000;
  return 1_000 * ((40_000 - reddito) / 8_000);
}

export function calcola(ral: number, _mensilita = 12): Risultato {
  const inps =
    ral * INPS_ALIQUOTA +
    Math.max(0, ral - INPS_PRIMA_FASCIA) * INPS_ALIQUOTA_AGGIUNTIVA;
  const imponibile = ral - inps;
  const { totale: irpefLorda, dettaglio } = perScaglioni(imponibile, SCAGLIONI_IRPEF);

  // le detrazioni non possono superare l'imposta: l'IRPEF non va sotto zero (incapienza)
  const detrazione = Math.min(detrazioneLavoroDipendente(imponibile), irpefLorda);
  const ulteriore = Math.min(
    ulterioreDetrazione(imponibile),
    irpefLorda - detrazione,
  );

  const irpefNetta = irpefLorda - detrazione - ulteriore;

  // Base = imponibile, non l'IRPEF: le detrazioni non le riducono.
  // Non sono dovute se l'IRPEF netta è zero.
  const dovute = irpefNetta > 0;
  const regionale = dovute ? perScaglioni(imponibile, SCAGLIONI_REGIONALE).totale : 0;
  const comunale =
    dovute && imponibile > ESENZIONE_COMUNALE
      ? imponibile * ALIQUOTA_COMUNALE
      : 0;

  const voci: Voce[] = [
    {
      label:
        ral > INPS_PRIMA_FASCIA
          ? "Contributi INPS (9,19% + 1%)"
          : "Contributi INPS (9,19%)",
      importo: inps,
      segno: "−",
    },
    { label: "IRPEF lorda", importo: irpefLorda, segno: "−", dettaglio },
    { label: "Detrazioni lavoro dipendente", importo: detrazione, segno: "+" },
    { label: "Ulteriore detrazione (L. 207/2024)", importo: ulteriore, segno: "+" },
    { label: "Addizionale regionale (Lombardia)", importo: regionale, segno: "−" },
    { label: "Addizionale comunale (Milano 0,8%)", importo: comunale, segno: "−" },
  ];

  const nettoAnnuo = imponibile - irpefNetta - regionale - comunale;

  return {
    ral,
    voci,
    nettoAnnuo,
    aliquotaEffettiva: (ral - nettoAnnuo) / ral,
  };
}

if (import.meta.env.DEV) {
  const r = calcola(35_000, 13);
  console.assert(Math.abs(r.nettoAnnuo - 26032.22) < 0.01, "RAL 35k", r);
}

// Quanto dei prossimi `step` euro di RAL non arriva in busta.
// Derivata numerica anziché formula analitica: se cambiano aliquote, scaglioni
// o formula delle detrazioni resta corretta senza toccarla.
export function aliquotaMarginale(ral: number, step = 100): number {
  return 1 - (calcola(ral + step).nettoAnnuo - calcola(ral).nettoAnnuo) / step;
}
