import json
import random
import time
from pathlib import Path

import requests
import math
from typing import Dict, List, Optional, Any

from shapely import Polygon
from shapely.geometry import Point
from shapely.ops import unary_union

from sqlalchemy.orm import Session
from shapely.errors import TopologicalError

from Backend.database.models import WaterBody, OrganismType, Occurrence, Organism, Region
from Backend.region_pol import REGION_POLYGONS, REGION_ID_MAP


OVERPASS_URL = "https://overpass-api.de/api/interpreter"
GBIF_API = "https://api.gbif.org/v1/occurrence/search"
INAT_API = "https://api.inaturalist.org/v1/observations/species_counts"
FISH_TAXON_ID = 47178  # Actinopterygii — лучепёрые рыбы :contentReference[oaicite:0]{index=0}




def fetch_water_bodies(bbox: str) -> List[Dict]:
    min_lat, min_lon, max_lat, max_lon = bbox.split(",")
    q = f"""
    [out:json][timeout:25];
    (way["water"~"lake|river"]({min_lat},{min_lon},{max_lat},{max_lon});
     relation["water"~"lake|river"]({min_lat},{min_lon},{max_lat},{max_lon}););
    out tags center;
    """
    r = requests.post(OVERPASS_URL, data=q)
    r.raise_for_status()
    elements = r.json().get("elements", [])
    result = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue
        center = el.get("center") or el.get("bounds")
        result.append(
            {
                "name": name,
                "latitude": center["lat"],
                "longitude": center["lon"],
                "depth": float(tags.get("depth", 0)) if tags.get("depth") else 0.0,
                "type": tags.get("water"),
            }
        )
    return result



def fetch_with_sleep(url, params):
    resp = requests.get(url, params=params)
    if resp.status_code == 429:
        # если всё же пришёл 429, почитаем Retry-After
        retry = int(resp.headers.get("Retry-After", 1))
        time.sleep(retry)
        return requests.get(url, params=params)
    time.sleep(1)  # пауза в 1 секунду
    return resp


def fetch_fish_counts(lat: float, lng: float, radius_km: float = 50.0):
    """Запрашивает у iNaturalist число наблюдений каждого вида рыбы."""
    params = {
        "lat": lat,
        "lng": lng,
        "radius": radius_km,
        "taxon_id": FISH_TAXON_ID,
    }
    resp = fetch_with_sleep(INAT_API, params=params)
    resp.raise_for_status()

    data = resp.json().get("results") or resp.json().get("species_counts", [])
    return data  # список словарей вида {'taxon': {...}, 'count': int} :contentReference[oaicite:1]{index=1}

def upsert_organism(session: Session, taxon: dict, fish_type_id: int) -> int:
    """
    Создаёт или обновляет запись Organism по iNaturalist taxon.id.
    Возвращает organism.id.
    """
    taxon_id = taxon["id"]
    sci_name = taxon.get("name")
    # Предпочтительное название
    common = taxon.get("preferred_common_name") or sci_name

    org = session.query(Organism).filter_by(gbif_id=taxon_id).first()
    if not org:
        org = Organism(
            gbif_id=taxon_id,
            name=common,
            species=sci_name,
            organism_type_id=fish_type_id
        )
        session.add(org)
        session.flush()
    return org.id

def save_occurrence(session: Session, water_body_id: int, organism_id: int, count: int):
    """Сохраняет или обновляет запись в таблице Occurrence."""
    occ = Occurrence(
        water_body_id=water_body_id,
        organism_id=organism_id,
        count=count
    )
    session.merge(occ)
    session.flush()

def populate_from_inat(session: Session, radius_km: float = 50.0):
    """
    Основная функция: для каждого водоёма вытаскивает lat/lon,
    получает по нему данные о рыбах и сохраняет в БД.
    """
    # Получаем id типа «fish» из таблицы OrganismType
    fish_type = session.query(OrganismType)\
                       .filter_by(name="Рыба")\
                       .first()
    if not fish_type:
        raise RuntimeError("Не найдена запись organism_type 'fish'")
    fish_type_id = fish_type.id

    # Проходим по всем водоёмам
    water_bodies = session.query(WaterBody).all()
    for wb in water_bodies:
        lat, lng = wb.latitude, wb.longitude  # координаты из модели :contentReference[oaicite:2]{index=2}
        species_data = fetch_fish_counts(lat, lng, radius_km)

        for item in species_data:
            taxon = item["taxon"]
            count = int(item.get("count", 0))
            if count <= 0:
                continue
            print(taxon)
            organism_id = upsert_organism(session, taxon, fish_type_id)
            save_occurrence(session, wb.id, organism_id, count)

    session.commit()



def add_region(session: Session):

    water_bodies = session.query(WaterBody).all()


    # Для каждого водоема определяем регион
    for wb in water_bodies:
        lat, lng = wb.latitude, wb.longitude

        # Получаем информацию о регионе
        region_info = get_region_by_bounding_boxes(lat, lng)

        # Если информация о регионе получена успешно
        if region_info :
            wb.region_id = region_info
            print(f"Водоем '{wb.name}' отнесен к региону: {region_info}")
        else:
            wb.region_id = 7
            print(f"Не удалось определить регион для водоема '{wb.name}' "
                  f"с координатами ({lat}, {lng})")

    # Фиксируем изменения в базе данных
    session.commit()

def get_region_by_bounding_boxes(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    pt = Point(longitude, latitude)

    for region_name, poly in REGION_POLYGONS.items():
        if poly.contains(pt):
            return REGION_ID_MAP[region_name]


    return None

def load_polygons_from_json(json_path: Path) -> dict[str, Polygon]:
    """
    Загружает JSON вида {
      "Название региона": { "0": [[lat, lon], ...], ... }, ...
    }
    и возвращает { region_name: Polygon (или MultiPolygon) }.
    При этом пробует исправить самопересечения через buffer(0).
    """
    data = json.loads(json_path.read_text(encoding='utf-8'))
    region_polys = {}

    for name, parts in data.items():
        valid_polys = []
        for contour in parts.values():
            coords = [(lon, lat) for lat, lon in contour]
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            try:
                poly = Polygon(coords)
                # Попытка исправления топологических ошибок
                if not poly.is_valid:
                    poly = poly.buffer(0)
                if not poly.is_valid:
                    raise TopologicalError(f"Polygon remains invalid after buffer(0)")
                valid_polys.append(poly)
            except TopologicalError as e:
                print(f"⚠️ Невозможно создать корректный полигон для {name}: {e}")
                # контур пропускаем

        # Объединяем все валидные контуры (если их несколько)
        if not valid_polys:
            print(f"❌ Для региона {name} не осталось валидных контуров.")
            continue
        region_polys[name] = unary_union(valid_polys)

    return region_polys

def sync_region_names(session: Session, region_names: list[str]):
    existing = {r.name for r in session.query(Region.name).all()}
    for name in region_names:
        if name not in existing:
            session.add(Region(name=name))
    session.commit()

def assign_waterbody_regions(session: Session, region_polys: dict[str, Polygon]):
    regions = {r.name: r.id for r in session.query(Region).all()}
    for wb in session.query(WaterBody).all():
        pt = Point(wb.longitude, wb.latitude)
        wb.region_id = None
        for name, poly in region_polys.items():
            if poly.contains(pt):
                wb.region_id = regions.get(name)
                break
        print(f"WB#{wb.id} '{wb.name}' → region_id={wb.region_id}")
    session.commit()



if __name__ == "__main__":
    from database.database import SessionLocal
    from Backend.water_bodies.crud import water_body_crud

    with SessionLocal() as session:
        water_body_crud.update_biodiversity_indices(session)