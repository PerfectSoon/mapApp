from sqlalchemy.orm import Session
from database.models import WaterBody, Organism, OrganismType, WaterBodyType, Status, Region


def populate_db(db: Session):
    try:
        # 1. Создаем регионы

        regions_data = ["Центральный", "Северо-Западный", "Южный", "Сибирский", "Дальневосточный"]
        regions = []
        for name in regions_data:
            region = Region(name=name)
            db.add(region)
            regions.append(region)
        db.commit()

        # 2. Создаем типы водоёмов
        wb_types_data = ["Озеро", "Река", "Пруд", "Болото", "Порт"]
        wb_types = []
        for name in wb_types_data:
            wb_type = WaterBodyType(name=name)
            db.add(wb_type)
            wb_types.append(wb_type)
        db.commit()

        # 3. Создаем типы организмов
        org_types_data = ["Рыба", "Водоросли", "Беспозвоночные"]
        org_types = []
        for name in org_types_data:
            org_type = OrganismType(name=name)
            db.add(org_type)
            org_types.append(org_type)
        db.commit()

        # 4. Создаем организмы
        org1 = Organism(
            name="Карп",
            species="Cyprinus carpio",
            description="Общераспространённая рыба.",
            organism_type_id=org_types[0].id
        )
        org2 = Organism(
            name="Щука",
            species="Esox lucius",
            description="Хищная рыба.",
            organism_type_id=org_types[0].id
        )
        org3 = Organism(
            name="Водоросль А",
            species="Chlorella vulgaris",
            description="Микроскопическая водоросль.",
            organism_type_id=org_types[1].id
        )
        db.add_all([org1, org2, org3])
        db.commit()

        # 5. Создаем водоёмы с заполнением всех необходимых полей
        # Для region_id ищем нужный регион по имени
        region_sibir = db.query(Region).filter_by(name="Сибирский").first()
        region_central = db.query(Region).filter_by(name="Центральный").first()

        wb1 = WaterBody(
            name="Озеро Байкал",
            type_id=wb_types[0].id,  # "Озеро"
            depth=1642.0,
            latitude=53.5,
            longitude=107.5,
            description="Самое глубокое озеро в мире.",
            region_id=region_sibir.id if region_sibir else None,
            ph=7.5,
            biodiversity_index=4.8,
            ecological_status=Status.great.value  # "Отличный"
        )
        wb2 = WaterBody(
            name="Река Волга",
            type_id=wb_types[1].id,  # "Река"
            depth=20.0,
            latitude=56.0,
            longitude=44.0,
            description="Самая длинная река в Европе.",
            region_id=region_central.id if region_central else None,
            ph=7.2,
            biodiversity_index=3.9,
            ecological_status=Status.good.value  # "Хороший"
        )
        db.add_all([wb1, wb2])
        db.commit()

        # 6. Связываем организмы с водоёмами
        wb1.organisms.append(org1)
        wb1.organisms.append(org3)
        wb2.organisms.append(org2)
        db.commit()



        print("Seeding completed!")
    except Exception as e:
        db.rollback()
        print("Error during seeding:", e)
    finally:
        db.close()
