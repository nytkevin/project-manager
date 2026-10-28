from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.models import refresh_token
from app.models import user
from app.routes.auth import router as auth_router
from app.routes.user import users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)


@app.get("/")
def root():
    return {
        "message": "Python backend is running"
    }

app.include_router(auth_router)
app.include_router(users_router)

@app.get("/health")
def health():
    return {"status": "ok"}