# CoffeeRow Lab V5 — data quality, offline reporting, and release criteria

## User-facing workflow
1. Open https://trinhtanphat.github.io/coffee-row-lab/.
2. In **Thí nghiệm**, assign treatments/blocks and export the harvest CSV template.
3. Fill actual dry green coffee bean weights (kg), harvested areas (m²), year and optional water/labor fields; then import CSV. The app does not store these uploads remotely.
4. In **Thống kê**, use RCBD ANOVA on a fully observed year; do not infer statistical significance merely from the computed F ratios.
5. In **Chất lượng**, inspect coverage by year/block, unusual entries, missing observations and explicit demonstration data provenance.
6. Export **Checklist CSV** and a **self-contained HTML report**. Open the HTML file offline and use the browser's print command for PDF.
7. Save a JSON project in the existing V4 section to preserve the inputs, and restore later. No automatic background saving or shared account sync.

## Quality checks (software QA, not agronomic certification)
The `CoffeeQuality.review()` function reports errors (unknown plots, duplicates, invalid area and negative/invalid numeric yield), warnings (no observations, incomplete plot coverage, synthetic provenance), and records needing review (zero harvest, yield >12,000 kg green beans per harvested hectare, changed harvested area across years for one plot).

**The 12,000 figure is an arbitrary software review trigger, not a physiological maximum, empirical upper bound, or recommended yield.** It is intended solely to flag likely unit mixups. A warning never deletes or changes original observations.

The annual coverage matrix displays observed/expected plots per block. An entire year must be complete before the V4 balanced RCBD calculation proceeds. Even a 'ready-for-descriptive' audit status does not prove measurements are correct or the field experiment is scientifically valid.

CSV export escapes quote characters and neutralizes string cells beginning with spreadsheet formula introducers after whitespace. User-supplied text is inserted into the page with `textContent`; the downloadable HTML report uses contextual HTML escaping on all data fields. HTML report contains no script and does not call external APIs.

## Scientific constraints
- Yield requires consistent product units (prefer green coffee beans rather than mixed cherries, parchment, or cherry weights) and harvested area.
- Comparing rows or countries requires independent field trials controlling for cultivar, management, soil, water and slope. The website does not perform real GIS, hydrological simulation, machine safety validation or crop growth modeling.
- V4 ANOVA assumes a balanced RCBD and additive effects; per-year F is not a p-value or proof of improvement. The multi-year chart is descriptive and repeated measurements are not independent replications.
- V5 report exports measured or synthetic records only as entered; synthetic demonstrations are flagged explicitly.
- This is an independent research-support web app, not official WASI, EMBRAPA, an agricultural authority, or a certified decision system.

## Validation matrix
- Node tests: `node --test tests/*.test.cjs`
- JavaScript syntax: `node --check field-audit.js && node --check lab-v5.js`
- Desktop + mobile browser QA on WIN11-181 in an isolated Chrome profile (no active session touched).
- GitHub Pages build must match the exact merged commit; HEAD/GET for new CSS/JS files must succeed; public Chrome QA must show zero JavaScript errors.
- Rollback tags: v4.0.0 from the stable predecessor, v5.0.0 after release.
- No GitHub Actions required.

## Project completion scope
Software deliverables covered: public research landing site, row-density simulator, illustrative 3D terrain, irrigation quantity scenarios, cost assumptions, elevation CSV importer, reproducible RCBD plot planner, harvest CSV importer, per-year statistics, project backup, input quality screening and portable reports.

Not completed by software alone: real field measurements, licensed aerial GIS/cadastral layers, weather service integration, instrument calibration, validation of irrigation equipment and machinery, measured farm economics or peer-reviewed Brazilian/Vietnamese productivity comparisons. These require separate acquisition and research, not a percentage-based software completion assertion.
