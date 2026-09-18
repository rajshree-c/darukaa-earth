import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { api, errorMessage } from './api';
import type { Analytics, Project, Site } from './types';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function Header() {
  const nav = useNavigate();
  return (
    <header>
      <Link className="brand" to="/dashboard">
        darukaa<span>.earth</span>
      </Link>
      <nav>
        <Link to="/dashboard">Portfolio</Link>
        <Link to="/map">Map</Link>
        <button
          className="link"
          onClick={() => {
            localStorage.removeItem('token');
            nav('/login');
          }}
        >
          Sign out
        </button>
      </nav>
    </header>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
function Auth({ register = false }: { register?: boolean }) {
  const nav = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      let result;
      if (register)
        result = await api.post('/auth/register', {
          name: data.get('name'),
          email: data.get('email'),
          password: data.get('password'),
        });
      else {
        const body = new URLSearchParams({
          username: String(data.get('email')),
          password: String(data.get('password')),
        });
        result = await api.post('/auth/login', body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      }
      localStorage.setItem('token', result.data.access_token);
      nav('/dashboard');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="auth">
      <form onSubmit={submit} className="card">
        <div className="eyebrow">DARUKAA.EARTH</div>
        <h1>{register ? 'Create your workspace' : 'Welcome back'}</h1>
        <p>Measure nature. Manage impact.</p>
        {register && (
          <label>
            Name
            <input required minLength={2} name="name" placeholder="Your name" />
          </label>
        )}
        <label>
          Email
          <input required type="email" name="email" placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input
            required
            minLength={8}
            type="password"
            name="password"
            placeholder="At least 8 characters"
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button disabled={loading}>
          {loading ? 'Working…' : register ? 'Create account' : 'Sign in'}
        </button>
        <p className="minor">
          {register ? 'Already registered?' : 'New here?'}{' '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
        <p className="demo">Demo: demo@darukaa.earth / DemoPass123!</p>
      </form>
    </div>
  );
}
function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  useEffect(() => {
    api
      .get('/projects')
      .then((r) => setProjects(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget);
      const result = await api.post('/projects', {
        name: f.get('name'),
        description: f.get('description'),
      });
      setProjects([result.data, ...projects]);
      setShow(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  return (
    <Shell>
      <section className="hero">
        <div>
          <div className="eyebrow">NATURAL CAPITAL PORTFOLIO</div>
          <h1>Make every hectare count.</h1>
          <p>Track carbon gains and biodiversity recovery across your conservation sites.</p>
        </div>
        <button onClick={() => setShow(true)}>+ New project</button>
      </section>
      {error && <div className="error">{error}</div>}
      {show && (
        <form className="card form" onSubmit={create}>
          <h2>New project</h2>
          <label>
            Project name
            <input name="name" required minLength={2} />
          </label>
          <label>
            Description
            <textarea name="description" />
          </label>
          <button>Create project</button>
        </form>
      )}
      <section className="grid">
        {projects.map((p) => (
          <Link className="project card" key={p.id} to={`/projects/${p.id}`}>
            <div className="project-top">
              <span className="badge">ACTIVE</span>
              <span>{p.site_count} sites</span>
            </div>
            <h2>{p.name}</h2>
            <p>{p.description || 'No description yet.'}</p>
            <strong>Explore project →</strong>
          </Link>
        ))}
        {!projects.length && !error && <p>Loading portfolio…</p>}
      </section>
    </Shell>
  );
}
function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<Project>();
  const [sites, setSites] = useState<Site[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api.get(`/projects/${id}`), api.get(`/sites?project_id=${id}`)])
      .then(([p, s]) => {
        setProject(p.data);
        setSites(s.data);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);
  if (error)
    return (
      <Shell>
        <div className="error">{error}</div>
      </Shell>
    );
  if (!project)
    return (
      <Shell>
        <p>Loading project…</p>
      </Shell>
    );
  return (
    <Shell>
      <Link className="back" to="/dashboard">
        ← Portfolio
      </Link>
      <section className="hero compact">
        <div>
          <div className="eyebrow">PROJECT</div>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <Link className="button" to={`/map?project=${id}`}>
          Add site on map
        </Link>
      </section>
      <div className="metrics">
        <Metric label="Managed sites" value={String(sites.length)} />
        <Metric
          label="Total area"
          value={`${sites.reduce((a, s) => a + s.area_hectares, 0).toFixed(1)} ha`}
        />
        <Metric
          label="Latest carbon"
          value={`${sites.reduce((a, s) => a + s.area_hectares * 5, 0).toFixed(0)} tCO₂e`}
        />
      </div>
      <h2>Sites</h2>
      <section className="grid">
        {sites.map((s) => (
          <Link className="site card" key={s.id} to={`/sites/${s.id}`}>
            <span className="badge">MONITORED</span>
            <h2>{s.name}</h2>
            <p>{s.description}</p>
            <strong>{s.area_hectares.toFixed(1)} hectares →</strong>
          </Link>
        ))}
        {!sites.length && <p>No sites yet. Draw the first boundary on the map.</p>}
      </section>
    </Shell>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function MapPage() {
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [drawn, setDrawn] = useState<number[][][] | null>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', project_id: '', description: '' });
  const mapRef = useRef<mapboxgl.Map | null>(null);
  useEffect(() => {
    api.get('/projects').then((r) => {
      setProjects(r.data);
      setForm((f) => ({ ...f, project_id: f.project_id || String(r.data[0]?.id || '') }));
    });
    api.get('/sites').then((r) => setSites(r.data));
  }, []);
  useEffect(() => {
    const container = document.getElementById('map');
    if (!container || mapRef.current) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      setMessage(
        'Mapbox token missing: add VITE_MAPBOX_TOKEN to frontend/.env. Site data is still available below.',
      );
      return;
    }
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [82, 23],
      zoom: 4,
    });
    mapRef.current = map;
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    map.addControl(draw);
    map.on('draw.create', (e: { features: Array<{ geometry: { coordinates: unknown } }> }) =>
      setDrawn(e.features[0].geometry.coordinates as number[][][]),
    );
    map.on('draw.update', (e: { features: Array<{ geometry: { coordinates: unknown } }> }) =>
      setDrawn(e.features[0].geometry.coordinates as number[][][]),
    );
    map.on('load', () => {
      map.addSource('sites', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'sites-fill',
        type: 'fill',
        source: 'sites',
        paint: { 'fill-color': '#35a46b', 'fill-opacity': 0.38 },
      });
      map.addLayer({
        id: 'sites-line',
        type: 'line',
        source: 'sites',
        paint: { 'line-color': '#e8f6dc', 'line-width': 2 },
      });
      map.on('click', 'sites-fill', (e) => {
        const id = e.features?.[0].properties?.id;
        if (id) nav(`/sites/${id}`);
      });
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [nav]);
  useEffect(() => {
    const source = mapRef.current?.getSource('sites') as mapboxgl.GeoJSONSource | undefined;
    if (source)
      source.setData({
        type: 'FeatureCollection',
        features: sites.map((s) => ({
          type: 'Feature' as const,
          properties: { id: s.id, name: s.name },
          geometry: { type: 'Polygon' as const, coordinates: s.coordinates },
        })),
      });
  }, [sites]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!drawn) return setMessage('Draw a polygon boundary before saving.');
    try {
      const created = await api.post('/sites', {
        ...form,
        project_id: Number(form.project_id),
        coordinates: drawn,
      });
      nav(`/sites/${created.data.id}`);
    } catch (err) {
      setMessage(errorMessage(err));
    }
  }
  return (
    <Shell>
      <section className="hero compact">
        <div>
          <div className="eyebrow">GEOSPATIAL WORKSPACE</div>
          <h1>Map your impact.</h1>
          <p>Select the polygon tool and click to draw a closed site boundary.</p>
        </div>
      </section>
      {message && <div className="error">{message}</div>}
      <div className="map-layout">
        <div id="map" className="map" />{' '}
        <form className="card form map-form" onSubmit={save}>
          <h2>Save boundary</h2>
          <label>
            Site name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Project
            <select
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            >
              {projects.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Description
            <textarea onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <button disabled={!drawn}>Save site</button>
          {drawn ? (
            <p className="success">Boundary ready to save.</p>
          ) : (
            <p className="minor">No boundary drawn.</p>
          )}
        </form>
      </div>
      <section className="grid map-list">
        {sites.map((s) => (
          <Link className="card site" key={s.id} to={`/sites/${s.id}`}>
            <h2>{s.name}</h2>
            <p>{s.area_hectares.toFixed(1)} ha · View analytics →</p>
          </Link>
        ))}
      </section>
    </Shell>
  );
}
function SiteDetail() {
  const { id } = useParams();
  const [site, setSite] = useState<Site>();
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api.get(`/sites/${id}`), api.get(`/sites/${id}/analytics`)])
      .then(([s, a]) => {
        setSite(s.data);
        setAnalytics(a.data);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);
  if (error)
    return (
      <Shell>
        <div className="error">{error}</div>
      </Shell>
    );
  if (!site)
    return (
      <Shell>
        <p>Loading site…</p>
      </Shell>
    );
  const labels = analytics.map((a) => a.year);
  const carbon = {
    labels,
    datasets: [
      {
        label: 'Carbon performance (tCO₂e)',
        data: analytics.map((a) => a.carbon_value),
        borderColor: '#3dc77d',
        backgroundColor: '#3dc77d',
        tension: 0.35,
      },
    ],
  };
  const biodiversity = {
    labels,
    datasets: [
      {
        label: 'Biodiversity index',
        data: analytics.map((a) => a.biodiversity_index),
        borderColor: '#e9b94e',
        backgroundColor: '#e9b94e',
        tension: 0.35,
      },
    ],
  };
  return (
    <Shell>
      <Link className="back" to={`/projects/${site.project_id}`}>
        ← Project
      </Link>
      <section className="hero compact">
        <div>
          <div className="eyebrow">MONITORED SITE</div>
          <h1>{site.name}</h1>
          <p>{site.description}</p>
        </div>
      </section>
      <div className="metrics">
        <Metric label="Site area" value={`${site.area_hectares.toFixed(1)} ha`} />
        <Metric label="Carbon, latest" value={`${analytics.at(-1)?.carbon_value ?? 0} tCO₂e`} />
        <Metric
          label="Biodiversity, latest"
          value={`${analytics.at(-1)?.biodiversity_index ?? 0}/100`}
        />
      </div>
      <section className="charts">
        <div className="card">
          <h2>Carbon performance</h2>
          <Line data={carbon} options={{ responsive: true }} />
        </div>
        <div className="card">
          <h2>Biodiversity recovery</h2>
          <Line data={biodiversity} options={{ responsive: true }} />
        </div>
      </section>
    </Shell>
  );
}
function Protected({ children }: { children: React.ReactNode }) {
  return localStorage.getItem('token') ? <>{children}</> : <Navigate to="/login" replace />;
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth register />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <Protected>
            <ProjectDetail />
          </Protected>
        }
      />
      <Route
        path="/map"
        element={
          <Protected>
            <MapPage />
          </Protected>
        }
      />
      <Route
        path="/sites/:id"
        element={
          <Protected>
            <SiteDetail />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
