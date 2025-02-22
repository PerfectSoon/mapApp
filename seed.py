from sqlalchemy.orm import Session
from database.models import WaterBody, Organism, OrganismType, WaterBodyType


def populate_db(db: Session):
    # Проверяем, есть ли уже водоёмы в базе
    water_bodies_count = db.query(WaterBody).count()
    if water_bodies_count == 0:
        wb_types = [
            WaterBodyType(name="Озеро"),
            WaterBodyType(name="Река"),
            WaterBodyType(name="Море")
        ]
        for wb_type in wb_types:
            db.add(wb_type)
        db.commit()
        # Получаем сохраненные типы водоёмов
        wb_types = db.query(WaterBodyType).all()

        # Создаем 3 типа рыб (организмов)
        org_types = [
            OrganismType(name="Хищная"),
            OrganismType(name="Травоядная"),
            OrganismType(name="Всеядная")
        ]
        for org_type in org_types:
            db.add(org_type)
        db.commit()
        # Получаем сохраненные типы рыб
        org_types = db.query(OrganismType).all()

        # Создаем 10 водоёмов
        water_bodies = []
        for i in range(1, 11):
            wb = WaterBody(
                name=f"Водоём {i}",
                type_id=wb_types[i % len(wb_types)].id,  # циклический выбор типа
                depth=10.0 * i,
                latitude=55.0 + i,
                longitude=37.0 + i,
                description=f"Описание водоёма {i}"
            )
            db.add(wb)
            water_bodies.append(wb)
        db.commit()
        # Обновляем список водоёмов из базы для установления связи
        water_bodies = db.query(WaterBody).all()

        # Создаем 10 рыб (организмов)
        for i in range(1, 11):
            org = Organism(
                name=f"Рыба {i}",
                species=f"Вид {i}",
                description=f"Описание рыбы {i}",
                organism_type_id=org_types[i % len(org_types)].id  # циклический выбор типа рыбы
            )
            # Устанавливаем связь многие‑ко‑многим с водоёмами:
            # каждая рыба будет привязана к первому водоёму, а для четных индексов добавляем еще один (например, второй)
            org.water_bodies.append(water_bodies[0])
            if i % 2 == 0 and len(water_bodies) > 1:
                org.water_bodies.append(water_bodies[1])
            db.add(org)
        db.commit()

        print("Начальные данные успешно добавлены в базу данных!")
    else:
        print("База данных уже содержит данные.")
