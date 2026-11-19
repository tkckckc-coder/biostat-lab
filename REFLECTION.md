# REFLECTION.md — why my app works (and where it would not)

*AI-use note: this reflection was drafted with the help of an AI assistant (Perplexity Computer), then reviewed by me.*

## Why it works
The app works mainly because the scientific choices were made before any code was written. Michaelis–Menten kinetics is a non-linear relationship, so the correct way to estimate Vmax and Km is non-linear least squares on the measured velocities. Each point is then weighted by its real error. Lineweaver–Burk turns the curve into a straight line, but taking 1/v makes the smallest, noisiest velocities at low [S] into the largest values, and they dominate the fit. My own results show this clearly. For the inhibitor condition, Lineweaver–Burk gave Vmax = 164 when the true value was 100, while `nls()` gave 99.2 ± 3.1. Because I named the method in the prompt, the agent could not quietly choose the worse one.

The second reason is that I validated the app against data where I already knew the answer. I simulated the data from known parameters, so I could compare every output with the truth. All four parameters came back within about one standard error, and the F-tests correctly found that the inhibitor changes Km but not Vmax, which is the signature of competitive inhibition. This matches the biochemistry. A competitive inhibitor binds the free enzyme at the active site, so enough substrate can still outcompete it and reach the same Vmax. You just need more substrate to get there, so the apparent Km rises by a factor of (1 + [I]/Ki). My estimated Ki of 6.5 µM is close to the true 6.7 µM.

The third reason is that the app checks its own inputs. It reports how many rows were dropped and warns when the substrate range is too narrow, so a user cannot get a confident-looking number from a bad file or a weak design without being told.

## Where it would not work
The app assumes the textbook case: initial rates, one substrate, no cooperativity and no substrate inhibition. An allosteric enzyme with a sigmoidal curve would still produce a "fit", but the parameters would be meaningless, and only the residual plot would hint at the problem. It also cannot tell whether my velocities are truly initial rates, whether the units in the file are right, or whether the replicates are biological or only technical. Those are experimental-design questions that stay with me. Finally, the app flagged a weakness in my own simulated design: the inhibitor condition only reaches 3.1 × Km, so its Vmax is partly extrapolated. I would not have noticed this without the check.

## What I learned about working with an agent
The agent was a very fast junior programmer. It wrote webR and `nls()` code I could not have written as quickly myself. However, every safeguard that makes the result trustworthy came from my prompts, not from the agent: the row-count check, the p-value format, the residual plot, and the comparison with true values. If I had just typed "analyse my enzyme data", I would have got a nice-looking app that could silently drop rows and report p = 0.0000. The AI did the labour, but deciding what a correct and defensible result looks like was my job.

