from pydantic import BaseModel
from typing import List, Optional

# Схемы для типов водоёмов
class WaterBodyTypeBase(BaseModel):
    name: str

class WaterBodyTypeCreate(WaterBodyTypeBase):
    pass

class WaterBodyTypeOut(WaterBodyTypeBase):
    id: int

    class Config:
        from_attributes = True

# Схемы для типов организмов
class OrganismTypeBase(BaseModel):
    name: str

class OrganismTypeCreate(OrganismTypeBase):
    pass

class OrganismTypeOut(OrganismTypeBase):
    id: int

    class Config:
        from_attributes = True

# Схемы для организмов
class OrganismBase(BaseModel):
    name: str
    species: str
    description: Optional[str] = None

class OrganismCreate(OrganismBase):
    # При создании указываем тип организма и список ID водоёмов (так как связь многие‑ко‑многим)
    organism_type_id: int
    water_body_ids: List[int] = []

# Чтобы при вложении избежать рекурсии, определяем краткую схему для водоёмов
class WaterBodyShortOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class OrganismOut(OrganismBase):
    id: int
    organism_type: OrganismTypeOut
    # В выходной схеме можно вывести краткую информацию по водоёмам, с которыми связан организм
    water_bodies: List[WaterBodyShortOut] = []

    class Config:
        from_attributes = True

# Схемы для водоёмов
class WaterBodyBase(BaseModel):
    name: str
    depth: float
    latitude: float
    longitude: float
    description: Optional[str] = None

class WaterBodyCreate(WaterBodyBase):
    # При создании указываем тип водоёма и список ID организмов, связанных с водоёмом
    type_id: int
    organism_ids: List[int] = []

# Для вложенного отображения организма в водоёме определим краткую схему
class OrganismShortOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class WaterBodyOut(WaterBodyBase):
    id: int
    type: WaterBodyTypeOut
    organisms: List[OrganismShortOut] = []

    class Config:
        from_attributes = True
