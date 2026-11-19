# ---- BioStat Kinetics: Michaelis-Menten analysis (runs in webR) ----
raw <- read.csv("/tmp/kinetics.csv", stringsAsFactors = FALSE)
n_raw <- nrow(raw)
need <- c("condition", "substrate_mM", "velocity")
if (!all(need %in% names(raw))) stop("CSV must have columns: condition, substrate_mM, velocity")
raw$substrate_mM <- suppressWarnings(as.numeric(raw$substrate_mM))
raw$velocity     <- suppressWarnings(as.numeric(raw$velocity))
d <- raw[complete.cases(raw[, need]) & raw$substrate_mM >= 0, need]
n_used <- nrow(d)
cat(sprintf("Rows read: %d | rows used: %d | rows dropped: %d\n", n_raw, n_used, n_raw - n_used))

conds <- unique(d$condition)
fits <- list(); res <- data.frame()
for (cc in conds) {
  di <- d[d$condition == cc, ]
  # Starting values from the data: Vmax ~ highest rate, Km ~ [S] giving half of it
  v0 <- max(di$velocity)
  k0 <- di$substrate_mM[which.min(abs(di$velocity - v0 / 2))]
  fit <- nls(velocity ~ Vmax * substrate_mM / (Km + substrate_mM),
             data = di, start = list(Vmax = v0, Km = max(k0, 1e-3)))
  fits[[cc]] <- fit
  co <- summary(fit)$coefficients
  # Lineweaver-Burk (1/v vs 1/[S]) for comparison only - NOT the reported fit
  lb <- lm(I(1 / velocity) ~ I(1 / substrate_mM), data = di[di$substrate_mM > 0, ])
  res <- rbind(res, data.frame(
    condition = cc, n = nrow(di),
    Vmax = co["Vmax", 1], Vmax_SE = co["Vmax", 2],
    Km = co["Km", 1], Km_SE = co["Km", 2],
    R2 = 1 - sum(resid(fit)^2) / sum((di$velocity - mean(di$velocity))^2),
    LB_Vmax = 1 / coef(lb)[1], LB_Km = coef(lb)[2] / coef(lb)[1],
    S_max_over_Km = max(di$substrate_mM) / co["Km", 1], row.names = NULL))
}
print(res, digits = 4, row.names = FALSE)

# Inhibition type check (needs 2 conditions): does a shared-Vmax model fit as well as separate Vmax?
inhib <- NULL
if (length(conds) == 2) {
  d$g <- factor(d$condition, levels = conds)
  full <- nls(velocity ~ c(Va, Vb)[g] * substrate_mM / (c(Ka, Kb)[g] + substrate_mM), data = d,
              start = list(Va = res$Vmax[1], Vb = res$Vmax[2], Ka = res$Km[1], Kb = res$Km[2]))
  sharedV <- nls(velocity ~ V * substrate_mM / (c(Ka, Kb)[g] + substrate_mM), data = d,
                 start = list(V = mean(res$Vmax), Ka = res$Km[1], Kb = res$Km[2]))
  sharedK <- nls(velocity ~ c(Va, Vb)[g] * substrate_mM / (K + substrate_mM), data = d,
                 start = list(Va = res$Vmax[1], Vb = res$Vmax[2], K = mean(res$Km)))
  pV <- anova(sharedV, full)[2, "Pr(>F)"]
  pK <- anova(sharedK, full)[2, "Pr(>F)"]
  inhib <- c(p_sameVmax_rejected = pV, p_sameKm_rejected = pK)
  print(inhib)
}

# Figure 1: raw points + fitted curves (no linearisation)
cols <- c("#4B1E6E", "#D99A1E", "#117A65", "#8A6FA8")
par(mfrow = c(1, 2), mar = c(4.5, 4.5, 2.5, 1))
plot(d$substrate_mM, d$velocity, type = "n", xlab = "[S] (mM)", ylab = "v (uM/min)",
     main = "Michaelis-Menten fit", ylim = c(0, max(d$velocity) * 1.1), xlim = c(0, max(d$substrate_mM)))
sgrid <- seq(0, max(d$substrate_mM), length.out = 200)
for (i in seq_along(conds)) {
  di <- d[d$condition == conds[i], ]
  points(di$substrate_mM, di$velocity, pch = 19, col = cols[i])
  lines(sgrid, predict(fits[[i]], newdata = data.frame(substrate_mM = sgrid)), col = cols[i], lwd = 2)
}
legend("bottomright", legend = conds, col = cols[seq_along(conds)], pch = 19, lwd = 2, bty = "n")
# Figure 2: residuals - should scatter randomly around zero
plot(d$substrate_mM, d$velocity, type = "n", log = "x", xlab = "[S] (mM, log scale)",
     ylab = "Residual (uM/min)", main = "Residuals",
     ylim = range(unlist(lapply(fits, resid))) * 1.2)
abline(h = 0, lty = 2, col = "grey40")
for (i in seq_along(conds)) {
  di <- d[d$condition == conds[i], ]
  points(di$substrate_mM, resid(fits[[i]]), pch = 19, col = cols[i])
}
# Hand results back to the web page as JSON text
num <- function(x) ifelse(is.na(x), "null", format(signif(x, 6), scientific = FALSE))
resf <- res; for (k in names(resf)[-1]) resf[[k]] <- num(resf[[k]])
rows <- apply(resf, 1, function(r) sprintf(
  '{"condition":"%s","n":%s,"Vmax":%s,"Vmax_SE":%s,"Km":%s,"Km_SE":%s,"R2":%s,"LB_Vmax":%s,"LB_Km":%s,"S_max_over_Km":%s}',
  r[["condition"]], trimws(r[["n"]]), r[["Vmax"]], r[["Vmax_SE"]], r[["Km"]], r[["Km_SE"]], r[["R2"]],
  r[["LB_Vmax"]], r[["LB_Km"]], r[["S_max_over_Km"]]))
out_json <- sprintf('{"n_raw":%d,"n_used":%d,"res":[%s],"pV":%s,"pK":%s}', n_raw, n_used,
  paste(rows, collapse = ","), if (is.null(inhib)) "null" else num(inhib[1]),
  if (is.null(inhib)) "null" else num(inhib[2]))
