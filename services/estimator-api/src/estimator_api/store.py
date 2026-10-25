"""SQLite persistence for saved estimates, independent of model serving."""

import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from estimator_api.schema import Estimate, EstimateRequest, HistoryPage, ModelResponse


class EstimateStore:
    """Use a short-lived connection per operation so request threads share no connection state."""

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as connection:
            # WAL lets readers continue while a request writes a new estimate.
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute(
                "CREATE TABLE IF NOT EXISTS estimates ("
                "id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL, "
                "features TEXT NOT NULL, price REAL NOT NULL, warnings TEXT NOT NULL, "
                "model_version TEXT NOT NULL, price_unit TEXT NOT NULL)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS estimates_created ON estimates(created_at DESC, id)"
            )

    @contextmanager
    def connection(self):
        """Commit on success, roll back on failure, and always release the connection."""
        connection = sqlite3.connect(self.path, timeout=5)
        connection.row_factory = sqlite3.Row
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    @staticmethod
    def decode(row: sqlite3.Row) -> Estimate:
        values = dict(row)
        values["features"] = json.loads(values["features"])
        values["warnings"] = json.loads(values["warnings"])
        return Estimate.model_validate(values)

    def create(self, request: EstimateRequest, result: ModelResponse) -> Estimate:
        """Store the prediction snapshot so later model changes cannot rewrite history."""
        prediction = result.predictions[0]
        estimate = Estimate(
            id=str(uuid4()),
            name=request.name,
            created_at=datetime.now(UTC).isoformat(),
            features=request.features,
            price=prediction.price,
            warnings=prediction.warnings,
            model_version=result.model_version,
            price_unit=result.price_unit,
        )
        with self.connection() as connection:
            connection.execute(
                "INSERT INTO estimates VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    estimate.id,
                    estimate.name,
                    estimate.created_at,
                    estimate.features.model_dump_json(),
                    estimate.price,
                    json.dumps(estimate.warnings),
                    estimate.model_version,
                    estimate.price_unit,
                ),
            )
        return estimate

    def history(self, page: int, page_size: int) -> HistoryPage:
        with self.connection() as connection:
            total = connection.execute("SELECT COUNT(*) FROM estimates").fetchone()[0]
            rows = connection.execute(
                "SELECT * FROM estimates ORDER BY created_at DESC, id LIMIT ? OFFSET ?",
                (page_size, (page - 1) * page_size),
            ).fetchall()
        return HistoryPage(
            items=[self.decode(row) for row in rows], total=total, page=page, page_size=page_size
        )

    def get(self, identifier: str) -> Estimate | None:
        with self.connection() as connection:
            row = connection.execute(
                "SELECT * FROM estimates WHERE id = ?", (identifier,)
            ).fetchone()
        return self.decode(row) if row else None
