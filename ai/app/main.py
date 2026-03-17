from fastapi import FastAPI

from app.api.router import api_router
from app.core.database import init_database


app = FastAPI(title="AI Server")
app.include_router(api_router, prefix="/api")


@app.on_event("startup")
async def startup() -> None:
    await init_database()


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
