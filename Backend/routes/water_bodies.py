from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database.database import get_db
from database.schemas import WaterBodyOut, WaterBodyCreate
from database.crud import water_body_crud

router = APIRouter()


@router.post("/create", response_model=WaterBodyOut)
def create_water_body(
        water_body: WaterBodyCreate,
        db: Session = Depends(get_db)
):
    try:
        return water_body_crud.create_water_body(db, water_body)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/", response_model=List[WaterBodyOut])
def search_water_bodies(
        name: Optional[str] = Query(None, description="Часть или полное название водоёма"),
        type_id: Optional[int] = Query(None, description="ID типа водоёма"),
        min_depth: Optional[float] = Query(None, description="Минимальная глубина"),
        max_depth: Optional[float] = Query(None, description="Максимальная глубина"),
        db: Session = Depends(get_db)
):
    water_bodies = water_body_crud.search_water_bodies(
        db,
        name=name,
        type_id=type_id,
        min_depth=min_depth,
        max_depth=max_depth
    )

    if not water_bodies:
        raise HTTPException(
            status_code=404,
            detail="Водоёмы, удовлетворяющие заданным параметрам, не найдены"
        )

    return water_bodies


@router.post("/{water_body_id}/add_organisms")
def add_organisms_to_water_body(
        water_body_id: int,
        organism_ids: List[int],
        db: Session = Depends(get_db)
):
    try:
        updated_water_body = water_body_crud.add_organisms_to_water_body(db, water_body_id, organism_ids)
        return {"message": "Организмы добавлены успешно", "water_body": updated_water_body}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))