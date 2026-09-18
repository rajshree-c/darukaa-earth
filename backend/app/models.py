from datetime import datetime
from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    projects: Mapped[list["Project"]] = relationship(back_populates="creator")


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    creator: Mapped[User] = relationship(back_populates="projects")
    sites: Mapped[list["Site"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Site(Base):
    __tablename__ = "sites"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(180))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    geometry: Mapped[str] = mapped_column(Geometry("POLYGON", srid=4326, spatial_index=True))
    area_hectares: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    project: Mapped[Project] = relationship(back_populates="sites")
    analytics: Mapped[list["SiteAnalytics"]] = relationship(back_populates="site", cascade="all, delete-orphan")


class SiteAnalytics(Base):
    __tablename__ = "site_analytics"
    __table_args__ = (UniqueConstraint("site_id", "year", name="uq_site_year"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), index=True)
    year: Mapped[int] = mapped_column(Integer)
    carbon_value: Mapped[float] = mapped_column(Float)
    biodiversity_index: Mapped[float] = mapped_column(Float)
    site: Mapped[Site] = relationship(back_populates="analytics")
