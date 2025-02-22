import csv
import io
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
from database import models
from database.database import get_db

router = APIRouter()


@router.get("/water_bodies")
def export_water_bodies(db: Session = Depends(get_db)):
    water_bodies = db.query(models.WaterBody).all()
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["id", "name", "type", "depth","latitude", "longitude", "description", "organisms"])
    for wb in water_bodies:
        organism_names = ", ".join([org.name for org in wb.organisms])
        writer.writerow([wb.id, wb.name, wb.type, wb.depth, wb.latitude, wb.longitude, wb.description or "", organism_names])
    stream.seek(0)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=water_bodies.csv"
    return response

@router.get("/organisms")
def export_organisms(db: Session = Depends(get_db)):
    organisms = db.query(models.Organism).all()
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["id", "name", "species", "description", "water_body_id"])
    for org in organisms:
        writer.writerow([org.id, org.name, org.species, org.description or "", org.water_body_id])
    stream.seek(0)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=organisms.csv"
    return response
