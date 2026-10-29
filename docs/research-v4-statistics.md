# CoffeeRow Lab V4 — Statistical & Project Module

## Purpose
V4 adds *per-year RCBD decomposition*, *within-block pair contrasts*, *year-by-year descriptive visualizations*, and *explicit JSON project backup/restore* to the previous geometry, irrigation, trial design and CSV ingestion features.

The application runs locally in the browser and does not upload observation files. The browser does not keep hidden durable copies: users must download the project JSON deliberately.

## Statistical guardrails
The core model for a randomized complete block design is: `Y[i,j] = µ + treatment[i] + block[j] + error[i,j]`.

For each **individual calendar year**, ANOVA requires a *complete* block design: exactly one valid measured value for every plot ID in the design. Missing plots or duplicate plot/year combinations cannot be analyzed as balanced RCBD.

Let `a` denote number of treatments, `b` denote number of blocks, `grand` denote grand mean, `meansTreat` the mean per treatment, and `meansBlock` mean per block:

- `SS_treat = b * Σ(meansTreat - grand)^2`
- `SS_block = a * Σ(meansBlock - grand)^2`
- `SS_total = Σ(Y - grand)^2`
- `residual[i,j] = Y[i,j] - meansTreat[i] - meansBlock[j] + grand`
- `SS_error = Σ(residual^2)`
- `df_treat = a-1`, `df_block = b-1`, `df_error = (a-1)(b-1)`, `df_total = ab-1`
- `F_treat = MS_treat / MS_error`, only if the residual variance is not numerically zero.

V4 does not calculate p-values, confidence intervals, multiple-comparison adjustments or mixed-effect models. It does **not** report an inferential conclusion of significance merely from F. Assumptions of independent errors, normal approximation, equal variances and additive treatment/block effects need examination by a statistician. Repeated observations of the same plot across years are **not independent replications**; V4 only shows them descriptively and never pools them into one annual ANOVA.

For treatment pairs A/B, it calculates differences within blocks where both treatment observations exist and reports mean paired difference B − A and sample SD. A partial dataset is identified as partial.

## JSON project portability
The explicit download has top-level `format: "coffeerow-research-project"`, `version: 4` and fields:
- `trial`: treatment labels, blocks, plot dimensions, random seed
- `terrain_csv`: original local-metre elevation grid CSV or null
- `observations_csv`: measured observation rows in CSV format or null
- `terrain_synthetic` and `observations_synthetic`: explicit data origin labels

An invalid JSON project is rejected before replacing any current state. The restore action prompts before replacing existing observation rows. Large files (>3.2 MB), malformed grids, duplicate or unrecognized plot IDs, and invalid treatments are rejected.

The built-in two-year sample data are deliberately flagged **SYNTHETIC** in the interface and exported JSON. They are not measured data and should not be used as study results. Exported ANOVA CSV has a `synthetic_example` column.

## Reference material
- NIST, *Randomized Block Designs*: https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm
- Penn State STAT 503, *Blocking*: https://online.stat.psu.edu/stat503/Lesson04
- SARE, *Basics of Experimental Design*: https://www.sare.org/publications/how-to-conduct-research-on-your-farm-or-ranch/basics-of-experimental-design/

## Test command
```sh
node --check lab-v3.js
node --check field-statistics.js
node --check lab-v4.js
node --test tests/*.test.cjs
```

Browser integration tests use isolated headless Chrome on WIN11-181, preserving existing interactive tabs and avoiding GitHub Actions quotas.
