from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from Backend.database.database import get_db
from Backend.database.schemas import WaterBodyOut, WaterBodyCreate, OrganismTypeCreate
from Backend.water_bodies.crud import water_body_crud

router = APIRouter()


@router.post("/create", response_model=WaterBodyOut)
def create_water_body(water_body: WaterBodyCreate, db: Session = Depends(get_db)):
    try:
        return water_body_crud.create_water_body(db, water_body)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/search", response_model=List[WaterBodyOut])
def search_water_bodies(
    name: Optional[str] = Query(None, description="Часть или полное название водоёма"),
    type_id: Optional[int] = Query(None, description="ID типа водоёма"),
    min_depth: Optional[float] = Query(None, description="Минимальная глубина"),
    max_depth: Optional[float] = Query(None, description="Максимальная глубина"),
    db: Session = Depends(get_db),
):
    water_bodies = water_body_crud.search_water_bodies(
        db, name=name, type_id=type_id, min_depth=min_depth, max_depth=max_depth
    )

    if not water_bodies:
        raise HTTPException(
            status_code=404,
            detail="Водоёмы, удовлетворяющие заданным параметрам, не найдены",
        )

    return water_bodies


@router.post("/{water_body_id}/add_organisms")
def add_organisms_to_water_body(
    water_body_id: int, organism_ids: List[int], db: Session = Depends(get_db)
):
    try:
        updated_water_body = water_body_crud.add_organisms_to_water_body(
            db, water_body_id, organism_ids
        )
        return {
            "message": "Организмы добавлены успешно",
            "water_bodies": updated_water_body,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create_org_type")
def create_org_type(org_type_data: OrganismTypeCreate, db: Session = Depends(get_db)):
    try:
        create_type = water_body_crud.create_organism_type(db, org_type_data)
        return {"message": "Тип Организма добавлен успешно", "org_type": create_type}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import/water-bodies/")
def import_wb(
    bbox: str = Query(..., description="south,west,north,east"),
    db: Session = Depends(get_db),
):
    water_body_crud.upsert_water_bodies(bbox, db)
    return {"status": "water bodies imported"}


@router.post("/import/occurrences/")
def import_occ(
    bbox: str = Query(..., description="south,west,north,east"),
    db: Session = Depends(get_db),
):
    water_body_crud.upsert_occurrences(bbox, db)
    return {"status": "occurrences imported"}
