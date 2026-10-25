"""Read-only HTTP checks for the running four-service workspace (Python 3.12+)."""

import argparse
import csv
import io
import json
import math
import statistics
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--web-url", default="http://localhost:3000")
    args = parser.parse_args()
    base = args.web_url.rstrip("/")

    def request(path, body=None, expected=200):
        payload = None if body is None else json.dumps(body).encode()
        req = Request(base + path, data=payload, headers={"Content-Type": "application/json"})
        try:
            response = urlopen(req, timeout=25)
        except HTTPError as error:
            assert error.code == expected, (path, error.code, error.read())
            return error.read()
        with response:
            assert response.status == expected, (path, response.status)
            return response.read()

    def data(path, body=None):
        return json.loads(request(path, body))

    # Confirm readiness and that the Java dataset matches the model's training source.
    for path in ("/api/health", "/api/estimator/health", "/api/market/health"):
        assert data(path)["status"] == "ok"
    overview = data("/api/market/market/overview")
    model = data("/api/estimator/model-info")
    properties = overview["properties"]
    assert overview["summary"]["property_count"] == len(properties) == model["training_rows"]
    assert overview["dataset_version"] == model["dataset_sha256"]
    assert math.isclose(
        overview["summary"]["median_price"], statistics.median(p["price"] for p in properties)
    )

    # Exported rows must match the same server-side segment as the dashboard.
    filtered = data("/api/market/market/overview?bedrooms=3&minPrice=200000")
    assert all(p["bedrooms"] == 3 and p["price"] >= 200000 for p in filtered["properties"])
    exported = list(
        csv.DictReader(
            io.StringIO(
                request("/api/market/market/export.csv?bedrooms=3&minPrice=200000").decode()
            )
        )
    )
    assert len(exported) == len(filtered["properties"])
    pdf = request("/api/market/market/export.pdf")
    assert pdf.startswith(b"%PDF-") and len(pdf) > 1000

    # Identical reference/scenario inputs exercise the real Java-to-model call with zero delta.
    features = {key: value for key, value in properties[0].items() if key not in {"id", "price"}}
    result = data("/api/market/market/what-if", {"baseline": features, "scenario": features})
    assert result["model_version"] == model["model_version"]
    assert result["change"] == 0 and result["baseline"]["price"] == result["scenario"]["price"]

    # Invalid submissions exercise validation without creating saved estimates.
    request("/api/market/market/what-if", {}, expected=422)
    request("/api/market/market/overview?minPrice=400000&maxPrice=100000", expected=422)
    request("/api/estimator/estimates", {"features": {}}, expected=422)
    history = data("/api/estimator/estimates")
    assert history["total"] >= len(history["items"])

    # Check server-rendered routes as well as the underlying JSON endpoints.
    for path in (
        "/",
        "/estimator",
        "/estimator/history",
        "/estimator/compare",
        "/market",
        "/market/what-if",
        "/model",
    ):
        html = request(path)
        assert b"main-content" in html and b"temporarily unavailable" not in html
    print(
        "Stack checks passed: health, dataset/model identity, filters, exports, what-if, "
        "validation, history, and seven portal routes."
    )


if __name__ == "__main__":
    main()
