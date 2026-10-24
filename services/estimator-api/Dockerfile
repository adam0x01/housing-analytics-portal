FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATABASE_PATH=/app/storage/estimates.sqlite
COPY services/estimator-api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY services/estimator-api/pyproject.toml ./pyproject.toml
COPY services/estimator-api/src ./src
RUN pip install --no-cache-dir --no-deps . \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --no-create-home app \
    && mkdir /app/storage && chown 10001:10001 /app/storage
USER 10001:10001
EXPOSE 8001
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "from urllib.request import urlopen; urlopen('http://127.0.0.1:8001/health', timeout=3)"
CMD ["uvicorn", "estimator_api.main:app", "--host", "0.0.0.0", "--port", "8001"]
