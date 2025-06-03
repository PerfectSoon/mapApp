# app/schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class OrganismTypeSchema(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class OrganismSchema(BaseModel):
    id: int
    gbif_id: Optional[int]
    name: str
    species: str
    description: Optional[str]
    organism_type: OrganismTypeSchema
    class Config:
        orm_mode = True

class OccurrenceSchema(BaseModel):
    organism: OrganismSchema
    count: int
    fetched_at: datetime
    class Config:
        orm_mode = True

class RegionSchema(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class WaterBodyTypeSchema(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class WaterBodyExportOut(BaseModel):
    id: int
    name: str
    depth: float
    latitude: float
    longitude: float
    description: Optional[str]
    ph: float
    biodiversity_index: Optional[float]
    ecological_status: Optional[str]
    created_at: datetime
    type: Optional[WaterBodyTypeSchema]
    region: Optional[RegionSchema]
    occurrences: List[OccurrenceSchema]
    class Config:
        orm_mode = True
