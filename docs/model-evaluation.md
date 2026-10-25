# Model service notes

The model service uses scikit-learn linear regression with the seven supplied housing features. It is shared by the Python estimator and Java what-if workflow.

## Lifecycle and API

- Training runs during the Docker image build and produces a model artifact with version metadata.
- The API loads that artifact once at startup. Prediction requests do not retrain the model.
- `POST /predict` accepts a single property or a batch and preserves input order.
- `GET /model-info` exposes model coefficients and performance metadata required by the assignment.
- `GET /health` reports readiness and the loaded model version.
- Invalid inputs return validation errors; inputs outside the observed data ranges receive warnings.

See the [model API README](../services/housing-model-api/README.md) for startup commands and request examples.

This is a demonstration model using the supplied sample. Predictions retain source price units and have not been validated for real-market valuations.
