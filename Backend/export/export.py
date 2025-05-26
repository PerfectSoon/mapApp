import json
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from fastapi.responses import StreamingResponse
from urllib.parse import quote

from Backend.database import models
from Backend.database.database import get_db
from Backend.export.depends import serialize_model


router = APIRouter()


@router.get("/json")
def export_json_data(
    water_body_ids: Optional[str] = Query(
        None, description="Список ID водоемов через запятую"
    ),
    db: Session = Depends(get_db),
):
    query = db.query(models.WaterBody).options(
        joinedload(models.WaterBody.organisms).joinedload(
            models.Organism.organism_type
        ),
        joinedload(models.WaterBody.type),
        joinedload(models.WaterBody.region),
    )

    if water_body_ids:
        ids = [int(id_str) for id_str in water_body_ids.split(",")]
        query = query.filter(models.WaterBody.id.in_(ids))

    water_bodies = query.all()

    serialized_data = [serialize_model(wb) for wb in water_bodies]

    json_data = json.dumps(
        {"water_bodies": serialized_data}, indent=2, ensure_ascii=False, default=str
    )

    filename = "export_selected.json"
    if water_body_ids and len(water_body_ids.split(",")) == 1:
        filename = f"export_{water_bodies[0].name if water_bodies else 'unknown'}.json"

    safe_filename = quote(filename, safe="")

    return StreamingResponse(
        iter([json_data.encode("utf-8")]),
        media_type="application/json; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"
        },
    )
