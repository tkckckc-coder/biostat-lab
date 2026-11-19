# EVALUATION.md — did the agent give me what I wanted?

## Short answer
Mostly yes. The agent built a working app in a few prompts, and it ran real R (`nls()`, `anova()`, base graphics) inside the browser with no installation. The core numbers are correct against the known simulated values. It did **not** add any of the scientific safeguards by itself, though: data checks, an honest p-value format, residuals, and validation against true values all came from my prompts.

## Verification I did

| Check | Expected | App result | Verdict |
|---|---|---|---|
| Vmax, no inhibitor | 100 µM/min | 101.0 ± 1.5 | ✓ within 1 SE |
| Km, no inhibitor | 2.0 mM | 2.01 ± 0.09 | ✓ |
| Vmax, inhibitor | 100 µM/min | 99.2 ± 3.1 | ✓ |
| Km, inhibitor | 5.0 mM | 5.12 ± 0.38 | ✓ |
| Inhibition type | competitive | competitive (same-Vmax p = 0.59; same-Km p < 0.0001) | ✓ |
| Ki | 10 / (5/2 − 1) ≈ 6.7 µM | 6.5 µM | ✓ close |
| Rows used, clean file | 42 of 42 | 42 of 42 | ✓ |
| Rows used, broken test file | 40 of 42, with a warning | "⚠ 2 of 42 rows dropped" | ✓ |
| Fit quality | random residuals | residuals scatter around 0 with no trend; spread grows slightly with v (I simulated noise proportional to v) | ✓ |

I also did a quick check by hand. At [S] = Km, v should be about Vmax/2. For no inhibitor, the replicates at [S] = 2 mM are about 50–53 µM/min, which is consistent with Vmax ≈ 100.

## What worked
- **webR in a Vite page.** It loaded R from the CDN and ran it in the browser. The `captureR()` function returned both the console text and the R plots, so the figures really are drawn by R.
- **Following a named method.** Because I named `nls()` and banned Lineweaver–Burk for the reported values, the agent did not choose a worse method on its own (the "name the method" rule from the slides).
- **The comparison model.** Fitting the shared-parameter models with indexed parameters (`c(Va, Vb)[g]`) and comparing them with `anova()` worked first time.
- **Speed.** About six prompts took me from nothing to a validated app.

## What did not work, or needed correcting
- **Safeguards had to be asked for.** The R code removes incomplete rows with `complete.cases()`. Without my explicit request to count and display dropped rows, that filtering would have happened silently. This is the "silent data loss" trap from the slides.
- **p = 0.0000.** The first interpretation box printed p = 0.0000, which is wrong (a p-value is never exactly zero). I fixed it to "p < 0.0001".
- **Messy console output.** R row names like `(Intercept)1` leaked into the printed table because of how the data frame was built. This was cosmetic but confusing.
- **Lineweaver–Burk is badly wrong for the inhibitor condition.** It gave Vmax = 164 and Km = 9.6, compared with the true 100 and 5.0. This is not a bug in the app. It is exactly the distortion the slides warned about, and it is why I kept the column as a teaching comparison.
- **My own design weakness was exposed.** The app's [S]-range check warns that, for the inhibitor, the highest [S] (16 mM) is only 3.1 × Km. The Vmax estimate there relies on extrapolation, which is why its SE (3.1) is twice that of the control. In a real experiment I would add 32 and 64 mM points, if the substrate is soluble enough.
- **The inhibition label is only a suggestion.** With two F-tests at α = 0.05, the label could be wrong for small or noisy datasets. Also, "both changed" cannot separate mixed from uncompetitive inhibition without more analysis. I labelled the box "check it yourself" on purpose.

## Things I would ask for next
1. A global fit of the competitive-inhibition model that estimates Ki directly with an SE, instead of calculating it from two separate Km values.
2. Support for more than two inhibitor concentrations, with a Dixon or global fit.
3. A download button for the results table (CSV) and the figure (PNG) for lab reports.
4. A substrate-inhibition model, $v = V_{max}[S]/(K_m + [S] + [S]^2/K_{si})$, as an option, with a comparison against the simple Michaelis–Menten model.
