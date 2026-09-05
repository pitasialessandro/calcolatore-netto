# Da RAL a netto

Prototipo che scompone una retribuzione annua lorda nelle voci che la riducono,
per rendere visibile **dove finiscono i soldi** invece di restituire solo il netto.

Ipotesi: dipendente a tempo indeterminato, anno intero, residente a Milano,
nessun familiare a carico e nessuna agevolazione.

## Struttura

- `src/calcolo.ts` — motore di calcolo. Funzioni pure, nessuna dipendenza da Vue o dal DOM.
- `src/App.vue` — form e cascata. La vista mensile divide in fase di render: il motore lavora sempre in annuale.

Le costanti fiscali stanno in cima a `calcolo.ts` con la fonte accanto.

## Dati di riferimento (2026)

| Voce | Valore | Fonte |
|---|---|---|
| IRPEF | 23% / 33% / 43% | L. 199/2025 (2° scaglione ridotto dal 35%) |
| Detrazioni lavoro dipendente | art. 13 TUIR, invariate | TUIR |
| Ulteriore detrazione (cuneo fiscale) | 1.000 € tra 20k e 32k, decrescente fino a 40k | art. 1 c. 4-9 L. 207/2024 |
| INPS dipendente | 9,19% + 1% oltre 56.224 € | INPS circ. 6/2026 |
| Addizionale regionale Lombardia | 1,23 / 1,58 / 1,72 / 1,73% | Dipartimento delle Finanze |
| Addizionale comunale Milano | 0,8%, esente fino a 23.000 € | Comune di Milano |

## Semplificazioni

Dichiarate anche in pagina, sotto "Assunzioni e semplificazioni". Le principali:

- Il netto mensile è il netto annuo diviso le mensilità. La tredicesima reale è
  più bassa (~130 €) perché non porta la sua quota di detrazioni, già distribuita
  sugli altri mesi: il totale annuo resta corretto.
- Nessun conguaglio di fine anno.
- Somma integrativa per redditi fino a 20.000 € non calcolata: è esente da IRPEF
  anziché essere una detrazione, e segue regole proprie.
- Massimale contributivo di 122.295 € non applicato.

## Sviluppo

```bash
npm install
npm run dev
```

Un `console.assert` in fondo a `calcolo.ts` verifica il caso RAL 35.000 a ogni avvio in dev.
