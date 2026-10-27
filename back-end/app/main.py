from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.database import Base, engine
from app.models import user
from app.routes.user import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/")
def root():
    return {
        "message": "Python backend is running"
    }

app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok"}