import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
import logging

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Исправленные импорты (с учетом структуры)
from database.database import Base, engine, SessionLocal
from routes import water_bodies, export
from seed import populate_db  # Предполагая, что seed.py находится в Backend/


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаем таблицы
    Base.metadata.create_all(bind=engine)

    # Заполняем базу данных
    db = SessionLocal()
    try:
        populate_db(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Интерактивные карты водоемов",
    lifespan=lifespan,

)

# Пути (исправлен регистр для Linux-совместимости)
BASE_DIR = Path(__file__).parent.parent  # project/
STATIC_DIR = BASE_DIR / "Frontend" / "static"
INDEX_PATH = STATIC_DIR / "index.html"

# Проверка путей
if not STATIC_DIR.exists():
    raise FileNotFoundError(f"Директория со статикой не найдена: {STATIC_DIR}")

if not INDEX_PATH.exists():
    raise FileNotFoundError(f"index.html не найден: {INDEX_PATH}")

# Роутеры
app.include_router(water_bodies.router, prefix="/water_bodies", tags=["water_bodies"])
app.include_router(export.router, prefix="/export", tags=["export"])

# Статические файлы
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# Главная страница
@app.get("/")
async def serve_index():
    return FileResponse(INDEX_PATH)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    uvicorn.run("main:app", reload=True)