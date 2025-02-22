from typing import List, Optional
from sqlalchemy import ForeignKey, String, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.database import Base


class WaterBody(Base):
    __tablename__ = "water_bodies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    type_id: Mapped[Optional[int]] = mapped_column(ForeignKey("water_body_types.id"))
    depth: Mapped[float] = mapped_column(Float, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Связь многие ко многим с Organism через вспомогательную таблицу "water_bodies_org"
    organisms: Mapped[List["Organism"]] = relationship(
        "Organism",
        secondary="water_bodies_org",
        back_populates="water_bodies"
    )

    # Связь с типом водоёма
    type: Mapped["WaterBodyType"] = relationship("WaterBodyType", back_populates="water_bodies")


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
    # Добавляем связь с таблицей типа организма
    organism_type_id: Mapped[int] = mapped_column(ForeignKey("organism_types.id"), nullable=False)

    # Связь многие ко многим с WaterBody через вспомогательную таблицу "water_bodies_org"
    water_bodies: Mapped[List["WaterBody"]] = relationship(
        "WaterBody",
        secondary="water_bodies_org",
        back_populates="organisms"
    )

    organism_type: Mapped["OrganismType"] = relationship("OrganismType", back_populates="organisms")


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
