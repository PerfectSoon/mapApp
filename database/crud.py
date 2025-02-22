from sqlalchemy.orm import Session
from database.models import Organism, WaterBody, WaterBodyType
from database.schemas import WaterBodyCreate, WaterBodyOut
from typing import List, Optional
from fastapi import HTTPException


class WaterBodyCRUD:
    def create_water_body(self, db: Session, water_body: WaterBodyCreate) -> WaterBody:
        wb_type = db.query(WaterBodyType).get(water_body.type_id)
        if not wb_type:
            raise ValueError("Тип водоёма не найден")

        db_water_body = WaterBody(
            name=water_body.name,
            type_id=water_body.type_id,
            depth=water_body.depth,
            latitude=water_body.latitude,
            longitude=water_body.longitude,
            description=water_body.description
        )

        db.add(db_water_body)
        db.commit()
        db.refresh(db_water_body)

        if water_body.organism_ids:
            self._link_organisms(db, db_water_body, water_body.organism_ids)

        return db_water_body

    def search_water_bodies(
            self,
            db: Session,
            name: Optional[str] = None,
            type_id: Optional[int] = None,
            min_depth: Optional[float] = None,
            max_depth: Optional[float] = None
    ) -> List[WaterBody]:
        query = db.query(WaterBody)

        if name:
            query = query.filter(WaterBody.name.ilike(f"%{name}%"))
        if type_id:
            query = query.filter(WaterBody.type_id == type_id)
        if min_depth is not None:
            query = query.filter(WaterBody.depth >= min_depth)
        if max_depth is not None:
            query = query.filter(WaterBody.depth <= max_depth)

        return query.all()

    def _link_organisms(self, db: Session, water_body: WaterBody, organism_ids: List[int]):
        organisms = db.query(Organism).filter(Organism.id.in_(organism_ids)).all()
        if len(organisms) != len(organism_ids):
            found_ids = {org.id for org in organisms}
            missing = set(organism_ids) - found_ids
            raise ValueError(f"Организмы с ID {missing} не найдены")

        water_body.organisms.extend(organisms)
        db.commit()
        db.refresh(water_body)


water_body_crud = WaterBodyCRUD()