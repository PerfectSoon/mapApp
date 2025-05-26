from datetime import datetime

from sqlalchemy import func, insert
from sqlalchemy.orm import Session
from Backend.database.models import Organism, WaterBody, WaterBodyType, OrganismType
from Backend.database.schemas import WaterBodyCreate, OrganismTypeCreate
from typing import List, Optional


from sqlalchemy import asc
from Backend.database.models import Occurrence
from Backend.importers import  fetch_water_bodies
from Backend.utils import  calculate_shannon


class WaterBodyCRUD:
    def upsert_water_bodies(self, bbox: str, db: Session):
        """
        Импорт или обновление водоёмов по bbox.
        Убираем дубликаты по name и сначала ищем существующие записи,
        чтобы не получить UNIQUE constraint failed.
        """
        items = fetch_water_bodies(bbox)

        seen_names = set()
        for wb in items:
            name = wb.get("name")
            if not name or name in seen_names:
                continue
            seen_names.add(name)

            # ищем существующую запись
            existing = db.query(WaterBody).filter_by(name=name).first()
            if existing:
                # обновляем динамические поля
                existing.latitude = wb["latitude"]
                existing.longitude = wb["longitude"]
                existing.depth = wb.get("depth", 0.0) or 0.0
                db.add(existing)
            else:
                # создаём новую
                new_wb = WaterBody(
                    name=name,
                    latitude=wb["latitude"],
                    longitude=wb["longitude"],
                    depth=wb.get("depth", 0.0) or 0.0,
                    type_id=None,
                    ph=7.0,
                    description=None,
                    region_id=None,
                    biodiversity_index=None,
                    ecological_status=None,
                    created_at=datetime.utcnow()
                )
                db.add(new_wb)

            # фиксируем изменения в сессии,
            # чтобы не держать слишком много объектов
            db.flush()

        db.commit()



    def create_water_body(
        self, db: Session, water_body: WaterBodyCreate
    ) -> WaterBody:
        """
        Создание нового водоёма вручную (без авто-импорта).
        """
        # Проверяем тип
        wb_type = db.query(WaterBodyType).get(water_body.type_id)
        if not wb_type:
            raise ValueError("Тип водоёма не найден")

        data = water_body.dict(exclude={"organism_ids"})
        db_wb = WaterBody(**data)
        db.add(db_wb)
        db.commit()
        db.refresh(db_wb)

        # Привязка существующих организмов, если указаны IDs
        if water_body.organism_ids:
            self._link_organisms(db, db_wb, water_body.organism_ids)

        return db_wb

    def search_water_bodies(
        self,
        db: Session,
        name: Optional[str] = None,
        type_id: Optional[int] = None,
        min_depth: Optional[float] = None,
        max_depth: Optional[float] = None,
    ) -> List[WaterBody]:
        """
        Фильтрация водоёмов по ряду параметров.
        """
        query = db.query(WaterBody)
        if name:
            query = (query.filter(WaterBody.name.ilike(f"%{name}%"))
                     .order_by(asc(WaterBody.name)))
        if type_id:
            query = query.filter(WaterBody.type_id == type_id)
        if min_depth is not None:
            query = query.filter(WaterBody.depth >= min_depth)
        if max_depth is not None:
            query = query.filter(WaterBody.depth <= max_depth)
        return query.all()

    def _link_organisms(
        self, db: Session, water_body: WaterBody, organism_ids: List[int]
    ):
        """
        Вспомогательный метод: связывает вручную заданные организмы с водоёмом.
        """
        orgs = db.query(Organism).filter(Organism.id.in_(organism_ids)).all()
        found = {o.id for o in orgs}
        missing = set(organism_ids) - found
        if missing:
            raise ValueError(f"Организмы с ID {missing} не найдены")
        # Связываем через Occurrence с count=0 (или любым дефолтом)
        for org in orgs:
            occ = Occurrence(
                water_body_id=water_body.id,
                organism_id=org.id,
                count=0
            )
            db.add(occ)
        db.commit()
        db.refresh(water_body)

    def add_organisms_to_water_body(
        self, db: Session, water_body_id: int, organism_ids: List[int]
    ) -> WaterBody:
        """
        Добавляет сущности Organism к существующему WaterBody.
        """
        wb = db.query(WaterBody).get(water_body_id)
        if not wb:
            raise ValueError("Водоём не найден")

        for org_id in organism_ids:
            exists = db.query(Occurrence).filter_by(
                water_body_id=wb.id, organism_id=org_id
            ).first()
            if exists:
                continue
            db.add(Occurrence(
                water_body_id=wb.id,
                organism_id=org_id,
                count=0
            ))

        db.commit()
        db.refresh(wb)
        return wb

    def create_organism_type(
        self, db: Session, org_type_data: OrganismTypeCreate
    ) -> None:
        """
        CRUD для типов организмов.
        """
        org_type = OrganismType(**org_type_data.dict())
        db.add(org_type)
        db.commit()
        db.refresh(org_type)
        return

    def update_biodiversity_indices(self,session: Session):
        water_bodies = session.query(WaterBody).all()
        for water_body in water_bodies:
            counts = {occ.organism.name: occ.count for occ in water_body.occurrences}
            H = calculate_shannon(counts)
            water_body.biodiversity_index = round(H, 3)
        session.commit()


water_body_crud = WaterBodyCRUD()
