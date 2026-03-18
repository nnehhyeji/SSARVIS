from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.database import init_database
from app.infra.qdrant import QdrantClient

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_database()
    qdrant_client = QdrantClient.get_instance()
    await qdrant_client.initialize_default_collection()
    try:
        yield
    finally:
        await qdrant_client.close()


app = FastAPI(title="AI Server", lifespan=lifespan)
app.include_router(api_router, prefix="/api")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
