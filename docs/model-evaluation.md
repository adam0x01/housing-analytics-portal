# Model evaluation

Recorded on 2026-10-23 using the supplied 50-row labelled file and the service's pinned Python 3.12 environment. Recreate the full report by running the training command in the [service instructions](../services/housing-model-api/README.md), or inspect `/model-info` on the running API.

Dataset SHA-256: `0e36c6224e1f6fb97c308c9dbe1d6da22d78d78055181067f8ac4c7155a4a726`.

## Held-out performance

Five shuffled folds with seed 42: each fold fits on 40 houses and predicts ten unseen houses. Metrics below pool all 50 out-of-fold predictions. A separate final model is then fitted on all 50 labelled rows for serving. There is no model tuning or model selection in this evaluation.

| Model | MAE | RMSE | R² |
| --- | ---: | ---: | ---: |
| Linear regression | 7,107.22 | 10,214.50 | 0.98350 |
| Mean-price baseline | 70,580.00 | 81,492.94 | -0.05000 |

MAE and RMSE are in the source file's price units. Currency is not supplied. Small floating-point differences across platforms are expected.

| Fold | Linear MAE | Linear RMSE | Linear R² |
| --- | ---: | ---: | ---: |
| 1 | 7,916.20 | 10,277.05 | 0.98112 |
| 2 | 8,802.56 | 12,515.33 | 0.98002 |
| 3 | 5,020.46 | 6,140.26 | 0.99119 |
| 4 | 8,254.55 | 13,260.14 | 0.96771 |
| 5 | 5,542.32 | 6,774.57 | 0.99188 |

R² is not an accuracy percentage or a confidence interval. This sample is too small and correlated to establish reliable real-market performance. Random folds can also be optimistic when similar properties occur in different folds. There is no information about geographic, temporal, or property-family groups to validate those forms of generalisation.

## Coefficient interpretation

The final full-data model has a negative square-footage coefficient (approximately -102.92) and negative bedroom coefficient (approximately -8,447.78). This does not establish that a larger home or an additional bedroom lowers its market price. The features move together, so the fitted partial effects can be unstable even when validation predictions look good.

The API exposes coefficients in raw input units and the intercept. They reconstruct an unrounded prediction as `intercept + sum(coefficient[name] * input[name])`. Tests verify this identity. A regularised model could improve coefficient stability, but its scaling and tuning need evaluation before replacing this baseline.

## Inference samples and limitations

The ten prediction samples have no labels and are used only to check inference. Some inputs exceed observed ranges: for example, the sixth sample's year built is 2013 (training maximum 2012) and school rating is 9.2 (training maximum 9.1). The eighth sample's distance is 2.0 (training minimum 2.1). The API predicts with explicit range warnings for these cases.

Missing currency/units, no location or sale dates, only 50 rows, and no independent labelled evaluation set remain material limitations. More representative data and independent validation are the next steps for any actual modelling application.
