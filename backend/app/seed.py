from sqlalchemy import func
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape
from shapely.geometry import Polygon
from .models import Project, Site, SiteAnalytics, User
from .security import hash_password

DEMO_SITES = [
    ("Sundarbans Mangrove Reserve", "Restoring tidal mangrove ecosystems and shoreline protection.", 88.47, [[88.62, 21.89], [88.69, 21.89], [88.69, 21.94], [88.62, 21.94], [88.62, 21.89]]),
    ("Buxa Forest Corridor", "Native habitat corridor supporting elephant movement.", 64.12, [[89.57, 26.7], [89.64, 26.7], [89.64, 26.75], [89.57, 26.75], [89.57, 26.7]]),
    ("Aravalli Regeneration Zone", "Community-led dry forest regeneration site.", 42.31, [[76.49, 28.19], [76.55, 28.19], [76.55, 28.24], [76.49, 28.24], [76.49, 28.19]]),
]

def seed(db: Session) -> None:
    if db.query(User).count(): return
    admin = User(name="Demo Administrator", email="demo@darukaa.earth", password_hash=hash_password("DemoPass123!"))
    db.add(admin); db.flush()
    projects = [Project(name="Eastern India Blue Carbon", description="Mangrove restoration and coastal resilience portfolio.", created_by=admin.id), Project(name="Wildlife Corridor Initiative", description="Landscape connectivity and biodiversity recovery.", created_by=admin.id)]
    db.add_all(projects); db.flush()
    for index, (name, description, area, coords) in enumerate(DEMO_SITES):
        site = Site(project_id=projects[index % 2].id, name=name, description=description, area_hectares=area, geometry=from_shape(Polygon(coords), srid=4326))
        db.add(site); db.flush()
        for offset, year in enumerate(range(2021, 2026)):
            db.add(SiteAnalytics(site_id=site.id, year=year, carbon_value=round(area * (3.4 + offset * .42), 2), biodiversity_index=round(53 + index * 5 + offset * 4.1, 1)))
    db.commit()
