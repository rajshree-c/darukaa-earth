# Darukaa.Earth

Darukaa.Earth is a full-stack natural-capital workspace for creating conservation projects, drawing geographical sites, and reviewing carbon and biodiversity trends. It includes immediately usable seeded demo data and responsive web UI.

## 🔗 Project Links

- **Live Demo:** https://darukaa-earth-virid.vercel.app
- **GitHub Repository:** https://github.com/rajshree-c/darukaa-earth
- **Backend API:** https://darukaa-backend-khaw.onrender.com
- **Backend Health Check:** https://darukaa-backend-khaw.onrender.com/health

## 🔐 Demo Credentials

**Email:** `demo@darukaa.earth`  
**Password:** `DemoPass123!`

## Architecture and stack

- **Frontend:** React, TypeScript, Vite, Mapbox GL JS + Mapbox Draw, Chart.js.
- **API:** FastAPI, SQLAlchemy 2, GeoAlchemy2, JWT/Bcrypt authentication.
- **Data:** PostgreSQL with PostGIS. Site geometry is a `POLYGON` in SRID 4326.
- **Deployment:** the static `frontend` deploys directly to Vercel; `backend` runs with Uvicorn/Gunicorn on Render; use a managed PostGIS database.

```
React/Vite ── JWT ──> FastAPI ── SQLAlchemy/GeoAlchemy2 ──> PostgreSQL/PostGIS
     │                     │
 Mapbox Draw           seed demo portfolio
 Chart.js
```

## Data model

`users` stores credentials (Bcrypt hashes only). `projects` belong to a user. `sites` belong to a project and store `geometry`, `area_hectares`, and metadata. `site_analytics` stores a unique annual carbon value and biodiversity index per site.

## API

| Area | Routes |
| --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Projects | `GET/POST /projects`, `GET /projects/{id}` |
| Sites | `GET/POST /sites`, `GET /sites/{id}` |
| Analytics | `GET/POST /sites/{id}/analytics` |

All routes except health and authentication require `Authorization: Bearer <JWT>`. The login endpoint uses OAuth form fields: `username` is the email and `password` is the password.

## Local setup

1. Copy `.env.example` to `.env`, set a strong `POSTGRES_PASSWORD` and `JWT_SECRET`. The API reads this repository-level file regardless of whether it is started from the root or `backend`. Copy `frontend/.env.example` to `frontend/.env` and add a public Mapbox token as `VITE_MAPBOX_TOKEN`.
2. Start PostGIS: `docker compose --env-file .env up -d db`.
3. Install Python 3.12+, then from `backend`: `python -m venv .venv`, activate it, and `pip install -r requirements.txt`.
4. From `backend`, run `uvicorn app.main:app --reload`. Tables and demo data are created on first start.
5. From the repository root, run `npm install` to activate Husky. From `frontend`, run `npm install` then `npm run dev`.

The application remains navigable without a Mapbox token; it clearly prompts the user to add one before rendering the interactive map. No token, database password, or JWT secret is checked in.

## Demo data

On an empty database startup, the seed creates `demo@darukaa.earth` / `DemoPass123!`, two projects, three sites (Sundarbans, Buxa, Aravalli), and yearly analytics for 2021–2025. Change or remove the account outside local demonstration environments.

## Quality controls

The frontend has ESLint, Prettier, Husky, and lint-staged. Run `npm run lint` and `npm run build` from `frontend`. Run `python -m compileall app` and `pytest` from `backend`. GitHub Actions executes these checks on pushes and pull requests.

## Deployment

For Vercel, set root directory to `frontend`, build command `npm run build`, output `dist`, and configure `VITE_API_URL` and `VITE_MAPBOX_TOKEN`. For Render, set root directory to `backend`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and configure `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_ORIGIN`. Provision PostgreSQL with PostGIS and use `postgresql+psycopg://` in `DATABASE_URL`.

## Trade-offs

Geometry area is calculated client-safe from degree-square approximation in the API to keep polygon creation fast; production reporting should use PostGIS geography (`ST_Area(geometry::geography)`) for accurate hectare calculations. Authentication is deliberately minimal (access token only); production should add refresh token rotation, role-based authorization, rate limiting, password recovery, migrations (Alembic), and object-level ownership checks.
