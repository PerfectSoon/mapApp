from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from Backend.database.models import WaterBody, Organism, WaterBodyType, Status, Region


class StatisticCrud:
    def statistics_summary(self, db: Session):
        total_water_bodies = db.query(WaterBody).count()
        avg_biodiversity_index = (
            db.query(func.avg(WaterBody.biodiversity_index)).scalar() or 0
        )
        total_species = db.query(Organism).count()
        low_status_count = (
            db.query(WaterBody)
            .filter(WaterBody.ecological_status == Status.low.value)
            .count()
        )

        return {
            "total_water_bodies": total_water_bodies,
            "average_biodiversity_index": round(avg_biodiversity_index, 2),
            "total_species": total_species,
            "water_bodies_low_status": low_status_count,
        }

    def statistics_by_type(self, db: Session):
        results = (
            db.query(
                WaterBodyType.name.label("type"),
                func.count(WaterBody.id).label("count"),
                func.avg(WaterBody.biodiversity_index).label("avg_biodiversity_index"),
            )
            .join(WaterBody, WaterBody.type_id == WaterBodyType.id)
            .group_by(WaterBodyType.id)
            .all()
        )

        return [
            {
                "type": r.type,
                "count": r.count,
                "avg_biodiversity_index": (
                    round(r.avg_biodiversity_index, 2)
                    if r.avg_biodiversity_index
                    else None
                ),
            }
            for r in results
        ]

    def statistics_ph_correlation(self, db: Session, limit: int = 100):
        """
        Корреляция pH и биоразнообразия. Данные выбираются динамически из базы.
        """
        results = (
            db.query(WaterBody.ph, WaterBody.biodiversity_index).limit(limit).all()
        )
        return [
            {"ph": r.ph, "biodiversity_index": r.biodiversity_index} for r in results
        ]

    def statistics_rare_species(self, db: Session):
        """
        Распределение редких видов по регионам.
        Для каждого региона подсчитывается количество уникальных организмов,
        связанных с водоёмами в этом регионе.
        """
        results = (
            db.query(
                Region.name.label("region"),
                func.count(func.distinct(Organism.id)).label("rare_species_count"),
            )
            .join(Region.water_bodies)
            .join(WaterBody.organisms)
            .group_by(Region.id)
            .all()
        )
        regions = [r.region for r in results]
        counts = [r.rare_species_count for r in results]
        return {"regions": regions, "rare_species_counts": counts}

    def compare_water_bodies(self, db: Session, water_body_ids: List[int]):
        water_bodies = (
            db.query(WaterBody).filter(WaterBody.id.in_(water_body_ids)).all()
        )
        return [
            {
                "id": wb.id,
                "name": wb.name,
                "depth": wb.depth,
                "ph": wb.ph,
                "organisms_count": len(wb.occurrences) if wb.occurrences else 0,
                "biodiversity_index": wb.biodiversity_index,
                "ecological_status": wb.ecological_status,
            }
            for wb in water_bodies
        ]


statistic_crud = StatisticCrud()
