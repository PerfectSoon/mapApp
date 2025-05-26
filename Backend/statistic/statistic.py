from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from Backend.database.database import get_db
from Backend.statistic.crud import statistic_crud
from Backend.database.schemas import WaterBodyCompareRequest

router = APIRouter()


@router.get("/summary")
def statistics_summary(db: Session = Depends(get_db)):
    return statistic_crud.statistics_summary(db)


@router.get("/by_type")
def statistics_by_type(db: Session = Depends(get_db)):
    return statistic_crud.statistics_by_type(db)


@router.get("/ph_correlation")
def statistics_ph_correlation(db: Session = Depends(get_db)):
    return statistic_crud.statistics_ph_correlation(db)


@router.get("/rare_species")
def statistics_rare_species(db: Session = Depends(get_db)):
    return statistic_crud.statistics_rare_species(db)


@router.post("/compare")
def compare_water_bodies(
    request: WaterBodyCompareRequest, db: Session = Depends(get_db)
):
    result = statistic_crud.compare_water_bodies(db, request.water_body_ids)
    if not result:
        raise HTTPException(status_code=404, detail="Водоёмы не найдены")
    return result
