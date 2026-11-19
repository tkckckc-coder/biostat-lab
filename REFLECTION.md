# REFLECTION.md — why my app works (and where it would not)

*Note: the ideas and analysis in this reflection are my own. An AI assistant helped translate them from Chinese and edit the English.*

## Why enzyme kinetics matters for drug discovery
Many drugs, such as kinase inhibitors, protease inhibitors and blockers of metabolic enzymes, work by changing how fast a specific enzyme works in the body. Enzyme kinetics gives a way to measure how an enzyme interacts with its substrate and with an inhibitor, and that matters in three ways:

- **Mechanism of action.** By watching how the rate changes with [S] and [I], we can tell whether an inhibitor is competitive, non-competitive, uncompetitive or mixed. This tells medicinal chemists whether to design molecules that look like the substrate (competitive) or molecules that bind somewhere else (allosteric or non-competitive).
- **Potency and selectivity.** Comparing Ki, or the change in the apparent parameters, shows how strongly a candidate binds the target enzyme. Doing the same comparison on related human enzymes shows whether it is selective enough to avoid off-target toxicity.
- **Linking dose to exposure.** Comparing parameters measured in vitro (Km, kcat) with the real substrate concentration in cells or tissue helps estimate how much drug is needed to inhibit the enzyme under physiological conditions.

## Why my app works
The app fits the Michaelis–Menten equation directly to the raw velocities by non-linear regression (`nls()`), instead of first linearising the data. The result that surprised me most shows why this matters. For the inhibitor condition, the **Lineweaver–Burk plot gave Vmax = 164, which is 64% higher than the true value of 100**. The `nls()` fit gave 99.2 ± 3.1.

The reason is how the double-reciprocal plot transforms the data. In a plot of 1/v against 1/[S], the points at low [S] are pushed far to the right, where 1/[S] is large. But at low [S] the signal is weakest and the relative noise is highest. The y-intercept is 1/Vmax, so a small intercept means a large Vmax. If the low-[S] points are even slightly high, they pull the slope and the intercept of the line. Extrapolating to 1/[S] = 0 then gives a badly overestimated or distorted Vmax, or even an impossible negative value. Fitting the original curve directly is much more robust.

The app also identified the inhibition type correctly. In the inhibitor condition, **Km rose (2.01 → 5.12 mM) but Vmax did not change** (F-test for the same Vmax, p = 0.59). This is **competitive inhibition**. A competitive inhibitor competes with the substrate for the active site, and the two cannot bind at the same time. With inhibitor present, more substrate is needed to push the inhibitor out and reach half the maximum rate, so the apparent Km increases. But if [S] is high enough, the substrate can still fill the active sites, and the enzyme's maximum catalytic capacity is not damaged, so Vmax stays the same.

## Where it would not work, and how I would improve the experiment
The app warned that in the inhibitor condition the highest [S] is only 3.1 × Km. With an inhibitor present the apparent Km (Km,app) gets larger, so at 3.1 × Km the curve may still be far from a clear plateau. That makes the estimates of Vmax and Km,app less reliable. If I did this as a real experiment, I would:

1. **Raise the top [S] and redesign the concentration series.** Using the expected Km,app of the inhibitor condition, I would raise the top [S] to about 10 × Km,app, as long as it stays below the substrate's solubility limit and does not cause substrate inhibition. I would use about 7–8 concentrations between 0.2 × and 10 × Km,app, spaced evenly or on a log scale.
2. **Control the conditions and the replicates.** I would keep the solvent for the substrate stock (for example DMSO) the same in every group and check that it does not inhibit the enzyme. I would add more replicates in the key low-[S] and high-[S] regions, and make sure I am measuring true initial velocities (v0), usually with less than 10% of the substrate used up.
3. **Use non-linear fitting first, with the double-reciprocal plot only as a check.** After collecting the full curve, I would fit the Michaelis–Menten equation by non-linear regression first, then check the residuals and use the Lineweaver–Burk plot only as a visual check.

## What I learned about working with an AI agent
**What the AI agent did well:** organising concepts, deriving formulas and writing scripts. Examples are calculating the fitted parameters, drawing the Michaelis–Menten and Lineweaver–Burk plots, and checking whether the data range should trigger a warning. It could also quickly draft a structured report or compare the features of different inhibition mechanisms.

**What I must judge myself:**

- **Whether the numbers make physical and biochemical sense.** For example, I had to recognise that Vmax = 164 was distorted by low-[S] noise and linear extrapolation, instead of trusting the program's output blindly.
- **Experimental design and practical trade-offs.** If I raise the top [S], I have to consider substrate solubility, the linear range of the detector, reagent cost and time. The AI cannot take responsibility for the physical limits of a real experiment.
- **The mechanism and the final conclusion.** Using the experimental context and the controls, I have to decide whether "Km up, Vmax unchanged" really means simple competitive inhibition, or whether it is an artefact of the narrow [S] range. I am responsible for whether the work is correct and for its academic integrity.
