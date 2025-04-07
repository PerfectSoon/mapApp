from typing import List, Optional
from sqlalchemy import Enum as SAEnum
from enum import Enum
from pydantic import EmailStr
from sqlalchemy import ForeignKey, String, Float, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.database import Base


class Status(str, Enum):
    low = "Низкий"
    avg = "Средний"
    good = "Хороший"
    great = "Отличный"

class WaterBody(Base):
    __tablename__ = "water_bodies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    type_id: Mapped[Optional[int]] = mapped_column(ForeignKey("water_body_types.id"))
    depth: Mapped[float] = mapped_column(Float, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    region_id: Mapped[Optional[int]] = mapped_column(ForeignKey("region.id"))
    ph: Mapped[float] = mapped_column(Float, nullable=False)
    biodiversity_index: Mapped[float] = mapped_column(Float, nullable=False)
    ecological_status: Mapped[str] = mapped_column(SAEnum(Status, native_enum=False), nullable=False)


    organisms: Mapped[List["Organism"]] = relationship(
        "Organism",
        secondary="water_bodies_org",
        back_populates="water_bodies"
    )

    type: Mapped["WaterBodyType"] = relationship("WaterBodyType", back_populates="water_bodies")
    region: Mapped["Region"] = relationship("Region", back_populates="water_bodies")


class WaterBodyOrganism(Base):
    __tablename__ = "water_bodies_org"

    water_body_id: Mapped[int] = mapped_column(ForeignKey("water_bodies.id"), primary_key=True)
    organism_id: Mapped[int] = mapped_column(ForeignKey("organisms.id"), primary_key=True)


class Organism(Base):
    __tablename__ = "organisms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    species: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    organism_type_id: Mapped[int] = mapped_column(ForeignKey("organism_types.id"), nullable=False)

    # Связь многие ко многим с WaterBody через вспомогательную таблицу "water_bodies_org"
    water_bodies: Mapped[List["WaterBody"]] = relationship(
        "WaterBody",
        secondary="water_bodies_org",
        back_populates="organisms"
    )

    organism_type: Mapped["OrganismType"] = relationship("OrganismType", back_populates="organisms")

class Region(Base):
    __tablename__ = "region"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    water_bodies: Mapped[List["WaterBody"]] = relationship("WaterBody", back_populates="region")

class WaterBodyType(Base):
    __tablename__ = "water_body_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    water_bodies: Mapped[List["WaterBody"]] = relationship("WaterBody", back_populates="type")


class OrganismType(Base):
    __tablename__ = "organism_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    organisms: Mapped[List["Organism"]] = relationship("Organism", back_populates="organism_type")

class UserRole(str, Enum):
    user = "user"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[EmailStr] = mapped_column(String, unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String, default=UserRole.user, nullable=False)