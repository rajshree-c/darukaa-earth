from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Token(BaseModel): access_token: str; token_type: str = "bearer"
class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; name: str; email: EmailStr; created_at: datetime
class ProjectCreate(BaseModel): name: str = Field(min_length=2, max_length=180); description: str | None = Field(None, max_length=3000)
class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; name: str; description: str | None; created_by: int; created_at: datetime; site_count: int = 0
class SiteCreate(BaseModel):
    project_id: int
    name: str = Field(min_length=2, max_length=180)
    description: str | None = Field(None, max_length=3000)
    coordinates: list[list[list[float]]]
    @field_validator("coordinates")
    @classmethod
    def valid_polygon(cls, value):
        if not value or len(value[0]) < 4 or value[0][0] != value[0][-1]:
            raise ValueError("Polygon must have a closed outer ring with at least four coordinates")
        if any(len(point) != 2 or not -180 <= point[0] <= 180 or not -90 <= point[1] <= 90 for ring in value for point in ring):
            raise ValueError("Coordinates must be valid longitude/latitude pairs")
        return value
class SiteOut(BaseModel):
    id: int; project_id: int; name: str; description: str | None; coordinates: list[list[list[float]]]; area_hectares: float; created_at: datetime
class AnalyticsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    year: int; carbon_value: float; biodiversity_index: float
class AnalyticsCreate(BaseModel): year: int = Field(ge=2000, le=2100); carbon_value: float = Field(ge=0); biodiversity_index: float = Field(ge=0, le=100)
