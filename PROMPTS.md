# PROMPTS.md

Agent: **Perplexity Computer** (an AI agent that writes files, runs commands and checks the output), not GitHub Copilot.
Below are the prompt used to start building the app and the prompts used to correct it, in order, written in the workshop's GOAL / DATA / METHOD / OUTPUT / CHECK format. They can be pasted into Copilot Agent mode to rebuild the same app.

---

## 1. Prompt used to start building the app

```
GOAL: Build a one-page Vite web app called "BioStat Kinetics" that runs real R in the browser using webR (load it from https://webr.r-wasm.org/v0.5.4/webr.mjs). It analyses enzyme kinetics data.

DATA: The user uploads a CSV with columns condition, substrate_mM (mM) and velocity (µM/min), one row per replicate. Also create a simulated example file data/enzyme_kinetics.csv (and a copy in public/) with two conditions: "no_inhibitor" (Vmax = 100 µM/min, Km = 2.0 mM) and "inhibitor_10uM" (competitive inhibitor, Vmax = 100 µM/min, Km = 5.0 mM). Use [S] = 0.25, 0.5, 1, 2, 4, 8, 16 mM, 3 replicates each, about 4% random noise, and a fixed random seed. Add a "Use simulated example data" button.

METHOD: Put all the R code in its own file, src/analysis.R, and import it into the page as text. Fit the Michaelis–Menten equation v = Vmax*S/(Km + S) with nls() separately for each condition. Do NOT use Lineweaver–Burk for the reported values. Choose the nls() starting values from the data, not hard-coded: Vmax = the highest velocity, Km = the [S] whose velocity is closest to half of that.

OUTPUT: A table of Vmax and Km ± standard error and R² for each condition, and a plot drawn by R showing the raw data points and the fitted curve for each condition.

CHECK: Show the R code you ran and the R console output under the results. Then start the app with npm run dev.
```

---

## 2. Prompts used to correct and improve the app

### Correction 1: no silent data loss
```
Before showing any results, add a "Data checks" section. Count the rows read and the rows actually used. If any rows were dropped because of missing, non-numeric or negative values, show a warning with the number dropped. Never drop rows silently. Also create data/test_with_missing_values.csv: a copy of the example data with one blank velocity and one non-numeric substrate value, so I can test this.
```

### Correction 2: check the experimental design
```
In the Data checks, for each condition calculate (highest [S]) / Km. If it is below 5, show a warning that Vmax is an extrapolation and that higher substrate concentrations are needed. Also warn if the standard error of Km is more than 25% of Km.
```

### Correction 3: compare the two conditions statistically
```
When there are exactly two conditions, find out which parameter the inhibitor changes. With nls(), fit (a) a full model with separate Vmax and Km for each condition, (b) a model with one shared Vmax, and (c) a model with one shared Km. Compare (b) and (c) with (a) using anova() (extra-sum-of-squares F-test). Show an "Interpretation (check it yourself)" box: same Vmax but higher Km = competitive; lower Vmax but same Km = non-competitive; both changed = mixed or uncompetitive. For competitive inhibition, calculate Ki from Km,app/Km = 1 + [I]/Ki, reading [I] from the condition name (e.g. "10uM").
```

### Correction 4: p-value reported as 0.0000
```
The interpretation box shows "p = 0.0000". A p-value can never be exactly zero. Show p-values below 0.0001 as "p < 0.0001" and other p-values to 4 decimal places.
```

### Correction 5: messy console table
```
The R console output shows row names like "(Intercept)1" in the results table. Remove the row names so that only the condition names are shown.
```

### Correction 6: honest figures and validation
```
Add a residual plot (residuals vs [S] on a log scale, with a dashed line at zero) next to the Michaelis–Menten plot. Also calculate Lineweaver–Burk estimates with lm(1/velocity ~ 1/substrate_mM) and add them to the table, clearly marked "for comparison only". When the example data is loaded, add columns with the true Vmax and Km used in the simulation, so the fit can be checked against known values.
```

### Final prompt: save my work
```
Commit and push all my changes with the message "BioStat Kinetics: nls fit, data checks, inhibition F-tests".
```

---

## What each correction fixed

| Correction | Problem I noticed | Result after the correction |
|---|---|---|
| 1 | Incomplete rows could be removed without telling the user | The test file now shows "⚠ 2 of 42 rows dropped" |
| 2 | No check of whether the [S] range is wide enough | Warns that the inhibitor condition only reaches 3.1 × Km |
| 3 | The app gave two separate fits but did not say how the inhibitor acts | F-tests: same Vmax p = 0.59, same Km p < 0.0001, so competitive inhibition; Ki ≈ 6.5 µM (true value ≈ 6.7) |
| 4 | "p = 0.0000" is not a valid p-value | Now shows "p < 0.0001" |
| 5 | Confusing row names in the console | Clean table |
| 6 | No way to check the model fit or the accuracy | Residual plot, Lineweaver–Burk comparison (Vmax 164 vs true 100), true-value columns |
