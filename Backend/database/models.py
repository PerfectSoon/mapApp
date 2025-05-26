from datetime import datetime
from typing import List, Optional
from sqlalchemy import Enum as SAEnum, Column, Integer, DateTime, func
from enum import Enum
from pydantic import EmailStr
from sqlalchemy import ForeignKey, String, Float, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from Backend.database.database import Base


class Status(str, Enum):
    low = "Низкий"
    avg = "Средний"
    good = "Хороший"
    great = "Отличный"


class WaterBody(Base):
    __tablename__ = "water_bodies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    type_id = Column(Integer, ForeignKey("water_body_types.id"), nullable=True)
    depth = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(Text, nullable=True)

    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    ph = Column(Float, nullable=False)

    biodiversity_index = Column(Float, nullable=True)
    ecological_status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    occurrences = relationship(
        "Occurrence", back_populates="water_body", cascade="all, delete-orphan"
    )
    organisms = relationship(
        "Organism",
        secondary="occurrences",
        back_populates="water_bodies"
    )
    type = relationship("WaterBodyType", back_populates="water_bodies")
    region = relationship("Region", back_populates="water_bodies")


class Organism(Base):
    __tablename__ = "organisms"

    id = Column(Integer, primary_key=True, index=True)
    gbif_id = Column(Integer, nullable=True, unique=True)
    name = Column(String, nullable=False, unique=True)
    species = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    organism_type_id = Column(Integer, ForeignKey("organism_types.id"), nullable=False)

    occurrences = relationship(
        "Occurrence", back_populates="organism", cascade="all, delete-orphan"
    )
    water_bodies = relationship(
        "WaterBody",
        secondary="occurrences",
        back_populates="organisms"
    )
    organism_type = relationship("OrganismType", back_populates="organisms")


class Occurrence(Base):
    __tablename__ = "occurrences"

    water_body_id = Column(
        Integer, ForeignKey("water_bodies.id", ondelete="CASCADE"), primary_key=True
    )
    organism_id = Column(
        Integer, ForeignKey("organisms.id", ondelete="CASCADE"), primary_key=True
    )
    count = Column(Integer, nullable=False)
    fetched_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    water_body = relationship("WaterBody", back_populates="occurrences")
    organism = relationship("Organism", back_populates="occurrences")


class Region(Base):
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    water_bodies = relationship("WaterBody", back_populates="region")


class WaterBodyType(Base):
    __tablename__ = "water_body_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    water_bodies = relationship("WaterBody", back_populates="type")


class OrganismType(Base):
    __tablename__ = "organism_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    organisms = relationship("Organism", back_populates="organism_type")


class UserRole(str, Enum):
    user = "user"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Float, default=True)
    role = Column(String, default=UserRole.user, nullable=False)
