from fastapi import FastAPI

from app.api.router import api_router


app = FastAPI(title="AI Server")
app.include_router(api_router, prefix="/api")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
