from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Polygon, mapping
from sqlalchemy import func
from sqlalchemy.orm import Session
from .config import get_settings
from .database import Base, engine, get_db
from .models import Project, Site, SiteAnalytics, User
from .schemas import AnalyticsCreate, AnalyticsOut, ProjectCreate, ProjectOut, SiteCreate, SiteOut, Token, UserCreate, UserOut
from .security import create_access_token, get_current_user, hash_password, verify_password
from .seed import seed

@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    from .database import SessionLocal
    db = SessionLocal()
    try: seed(db)
    finally: db.close()
    yield

app = FastAPI(title="Darukaa.Earth API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=get_settings().frontend_origins.split(","), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def site_out(site: Site) -> SiteOut:
    return SiteOut(id=site.id, project_id=site.project_id, name=site.name, description=site.description, coordinates=mapping(to_shape(site.geometry))["coordinates"], area_hectares=site.area_hectares, created_at=site.created_at)

@app.get("/health")
def health(): return {"status": "ok"}

@app.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(func.lower(User.email) == payload.email.lower()).first(): raise HTTPException(409, "An account with this email already exists")
    user = User(name=payload.name, email=payload.email.lower(), password_hash=hash_password(payload.password)); db.add(user); db.commit(); db.refresh(user)
    return Token(access_token=create_access_token(user.email))

@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == form.username.lower()).first()
    if not user or not verify_password(form.password, user.password_hash): raise HTTPException(status_code=401, detail="Incorrect email or password")
    return Token(access_token=create_access_token(user.email))

@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)): return user

@app.get("/projects", response_model=list[ProjectOut])
def projects(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Project, func.count(Site.id)).outerjoin(Site).group_by(Project.id).order_by(Project.created_at.desc()).all()
    return [ProjectOut.model_validate(p, from_attributes=True).model_copy(update={"site_count": count}) for p, count in rows]

@app.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = Project(**payload.model_dump(), created_by=user.id); db.add(project); db.commit(); db.refresh(project); return project

@app.get("/projects/{project_id}", response_model=ProjectOut)
def project(project_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.get(Project, project_id)
    if not item: raise HTTPException(404, "Project not found")
    return ProjectOut.model_validate(item, from_attributes=True).model_copy(update={"site_count": len(item.sites)})

@app.get("/sites", response_model=list[SiteOut])
def sites(project_id: int | None = None, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Site).order_by(Site.created_at.desc())
    if project_id: query = query.filter(Site.project_id == project_id)
    return [site_out(site) for site in query.all()]

@app.post("/sites", response_model=SiteOut, status_code=201)
def create_site(payload: SiteCreate, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.get(Project, payload.project_id): raise HTTPException(404, "Project not found")
    polygon = Polygon(payload.coordinates[0], payload.coordinates[1:])
    if not polygon.is_valid: raise HTTPException(422, "Polygon geometry is invalid")
    area = abs(polygon.area) * 1232100
    site = Site(project_id=payload.project_id, name=payload.name, description=payload.description, area_hectares=round(area, 2), geometry=from_shape(polygon, srid=4326))
    db.add(site); db.commit(); db.refresh(site); return site_out(site)

@app.get("/sites/{site_id}", response_model=SiteOut)
def site(site_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.get(Site, site_id)
    if not item: raise HTTPException(404, "Site not found")
    return site_out(item)

@app.get("/sites/{site_id}/analytics", response_model=list[AnalyticsOut])
def analytics(site_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.get(Site, site_id): raise HTTPException(404, "Site not found")
    return db.query(SiteAnalytics).filter(SiteAnalytics.site_id == site_id).order_by(SiteAnalytics.year).all()

@app.post("/sites/{site_id}/analytics", response_model=AnalyticsOut, status_code=201)
def add_analytics(site_id: int, payload: AnalyticsCreate, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.get(Site, site_id): raise HTTPException(404, "Site not found")
    item = SiteAnalytics(site_id=site_id, **payload.model_dump()); db.add(item)
    try: db.commit()
    except Exception: db.rollback(); raise HTTPException(409, "Analytics already exist for this year")
    db.refresh(item); return item
