from typing import List

from sqlalchemy.orm import Session, joinedload

from Backend.database.models import WaterBody, Occurrence, Organism


def export(db:Session, ids: List[int]):
    q = (
        db.query(WaterBody)
        .options(
            joinedload(WaterBody.type),
            joinedload(WaterBody.region),
            joinedload(WaterBody.occurrences)
            .joinedload(Occurrence.organism)
            .joinedload(Organism.organism_type)
        )
        .filter(WaterBody.id.in_(ids))
    )
    water_bodies = q.all()

    return water_bodies