from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models as model_registry
from app.core.config import settings
from app.core.database import Base, engine
from app.routes.auth import router as auth_router
from app.routes.projects import router as projects_router
from app.routes.reviews import router as reviews_router
from app.routes.tasks import router as tasks_router
from app.routes.teams import router as teams_router
from app.routes.user import users_router
from app.routes.work_sessions import router as work_sessions_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if not model_registry.__all__:
        raise RuntimeError("No database models are registered")
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)


@app.get("/")
def root():
    return {
        "message": "Python backend is running"
    }

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(projects_router)
app.include_router(teams_router)
app.include_router(tasks_router)
app.include_router(work_sessions_router)
app.include_router(reviews_router)

@app.get("/health")
def health():
    return {"status": "ok"}