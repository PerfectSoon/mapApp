import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database.database import Base, engine, SessionLocal
from routes import water_bodies, organisms, export
from seed import populate_db



@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        populate_db(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Интерактивные карт водоемов",
    lifespan=lifespan
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app.include_router(water_bodies.router, prefix="/water_bodies", tags=["water_bodies"])
#app.include_router(organisms.router, prefix="/organisms", tags=["organisms"])
app.include_router(export.router, prefix="/export", tags=["export"])


app.mount("/static", StaticFiles(directory="static", html=True), name="static")


@app.get("/", include_in_schema=False)
async def read_index():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", reload=True)