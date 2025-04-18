from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
import logging

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from database.database import Base, engine, SessionLocal
from water_bodies import water_bodies
from statistic import statistic
from export import export
from user import auth_router
from seed import populate_db
from user.create_admin import create_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        #populate_db(db)
        create_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Интерактивные карты водоемов",
    lifespan=lifespan,

)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent.parent  # mapApp/
STATIC_DIR = BASE_DIR / "Frontend" / "static"
INDEX_PATH = STATIC_DIR / "index.html"


app.include_router(water_bodies.router, prefix="/water_bodies", tags=["water_bodies"])
app.include_router(export.router, prefix="/export", tags=["export"])
app.include_router(auth_router.router, prefix="/auth", tags=["auth"])
app.include_router(statistic.router, prefix="/statistics", tags=["statistics"])


app.mount("/static", StaticFiles(directory=STATIC_DIR,  html=True), name="static")


@app.get("/")
async def serve_index():
    return FileResponse(INDEX_PATH)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    uvicorn.run("main:app", reload=True)