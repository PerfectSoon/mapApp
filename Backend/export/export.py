import json
from typing import Optional, List

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from fastapi.responses import StreamingResponse
from urllib.parse import quote

from Backend.database import models
from Backend.database.database import get_db
from Backend.export.crud import export
from Backend.export.depends import serialize_model
from Backend.export.schemas import WaterBodyExportOut
from Backend.user.depends import scientific_required

router = APIRouter()


@router.get("/json", response_model=List[WaterBodyExportOut])
def export_water_bodies(
    ids: List[int] = Query(..., description="Список ID водоёмов для экспорта"),
    db: Session = Depends(get_db),
    current_user = Depends(scientific_required),
):
    water_bodies = export(db,ids)

    if not water_bodies:
        raise HTTPException(status_code=404, detail="Водоёмы не найдены")

    return water_bodies