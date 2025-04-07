from pydantic import BaseModel
from typing import List, Optional
from database.models import Status


class WaterBodyCompareRequest(BaseModel):
    water_body_ids: List[int]

class WaterBodyTypeBase(BaseModel):
    name: str

class WaterBodyTypeCreate(WaterBodyTypeBase):
    pass

class WaterBodyTypeOut(WaterBodyTypeBase):
    id: int

    class Config:
        from_attributes = True

class WaterBodyRegion(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class OrganismTypeBase(BaseModel):
    name: str

class OrganismTypeCreate(OrganismTypeBase):
    pass

class OrganismTypeOut(OrganismTypeBase):
    id: int

    class Config:
        from_attributes = True


class OrganismBase(BaseModel):
    name: str
    species: str
    description: Optional[str] = None

class OrganismCreate(OrganismBase):

    organism_type_id: int
    water_body_ids: List[int] = []


class WaterBodyShortOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class OrganismOut(OrganismBase):
    id: int
    organism_type: OrganismTypeOut
    water_bodies: List[WaterBodyShortOut] = []

    class Config:
        from_attributes = True


class WaterBodyBase(BaseModel):
    name: str
    depth: float
    latitude: float
    longitude: float
    description: Optional[str] = None
    ph: float
    biodiversity_index: float
    ecological_status: Status

class WaterBodyCreate(WaterBodyBase):
    type_id: int
    region_id: int
    organism_ids: List[int] = []


class OrganismShortOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class WaterBodyOut(WaterBodyBase):
    id: int
    type: WaterBodyTypeOut
    region: WaterBodyRegion
    organisms: List[OrganismShortOut] = []

    class Config:
        from_attributes = True

