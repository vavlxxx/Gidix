import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  ImagePlus,
  Loader2,
  LogIn,
  LogOut,
  Map,
  MapPin,
  Plus,
  Route as RouteIcon,
  Save,
  Sparkles,
  Ticket,
  Trash2,
  UserPlus,
  Wand2,
  X
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./styles/tokens.css";
import "./styles/globals.css";
import { adminApi, authApi, bookingsApi, excursionsApi, getAccessToken, setAccessToken } from "./api/client";

const placeholder = import.meta.env.VITE_PLACEHOLDER_IMAGE || "https://placehold.co/600x400/EEE/31343C";
const tileUrl = import.meta.env.VITE_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const tileAttribution = import.meta.env.VITE_TILE_ATTRIBUTION || "© OpenStreetMap contributors";
const markerIcon = L.divIcon({ className: "map-marker", html: "", iconSize: [18, 18] });
const activeMarkerIcon = L.divIcon({ className: "map-marker map-marker--active", html: "", iconSize: [22, 22] });

const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [ready, setReady] = React.useState(false);

  const loadProfile = React.useCallback(async () => {
    if (!getAccessToken()) {
      setReady(true);
      return null;
    }
    try {
      const profile = await authApi.profile();
      setUser(profile);
      return profile;
    } catch {
      setAccessToken("");
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function login(data) {
    const tokens = await authApi.login(data);
    setAccessToken(tokens.access_token);
    return loadProfile();
  }

  async function register(data) {
    await authApi.register(data);
    return login({ email: data.email, password: data.password });
  }

  async function logout() {
    await authApi.logout().catch(() => null);
    setAccessToken("");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, ready, login, register, logout }}>{children}</AuthContext.Provider>;
}

function useAuth() {
  return React.useContext(AuthContext);
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}

function Shell() {
  const auth = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand" to="/">GIDIX</Link>
          <nav className="site-nav">
            <NavLink to="/">Экскурсии</NavLink>
            <NavLink to="/#map">Карта</NavLink>
            <NavLink to="/#dates">Даты</NavLink>
            {auth.user && <NavLink to="/admin">Управление</NavLink>}
          </nav>
          <div className="site-actions">
            {auth.user ? (
              <>
                <span className="user-chip">{auth.user.full_name || auth.user.email}</span>
                <button className="button ghost" onClick={() => auth.logout().then(() => navigate("/"))}>
                  <LogOut size={17} /> Выйти
                </button>
              </>
            ) : (
              <>
                <NavLink className="button ghost" to="/login"><LogIn size={17} /> Вход</NavLink>
                <NavLink className="button primary" to="/register"><UserPlus size={17} /> Регистрация</NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<ExcursionsPage />} />
          <Route path="/excursions/:id" element={<ExcursionDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </>
  );
}

function ExcursionsPage() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    excursionsApi.list()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="catalog-hero">
        <div>
          <span className="eyebrow">маршруты и экскурсии</span>
          <h1>Готовые прогулки с понятным маршрутом, датами и заявками</h1>
          <p>Выберите экскурсию, посмотрите точки на карте и оставьте заявку на удобную дату.</p>
        </div>
      </section>
      {loading && <InlineState icon={<Loader2 className="spin" />} text="Загрузка экскурсий" />}
      {error && <InlineState text={error} tone="error" />}
      {!loading && !items.length && (
        <section className="empty">
          <h2>Экскурсий пока нет</h2>
          <p>Войдите в управление, добавьте точки, рассчитайте маршрут и создайте экскурсию.</p>
          <Link className="button primary" to="/admin">Открыть управление</Link>
        </section>
      )}
      <div className="grid">
        {items.map((item) => (
          <Link className="card excursion-card" key={item.id} to={`/excursions/${item.id}`}>
            <img src={coverForExcursion(item)} alt="" />
            <div>
              <h2>{item.title}</h2>
              <p>{shortText(item.description || "Описание можно сгенерировать через Ollama в панели управления.", 140)}</p>
              <div className="card-meta">
                <span>{Number(item.base_price).toLocaleString("ru-RU")} ₽</span>
                <span>{item.duration_min || item.route?.estimated_duration_min || "—"} мин</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function ExcursionDetailPage() {
  const { id } = useParams();
  const [item, setItem] = React.useState(null);
  const [sessions, setSessions] = React.useState([]);
  const [form, setForm] = React.useState({
    session_id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    participants_count: 1,
    comment: ""
  });
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    const detail = await excursionsApi.get(id);
    setItem(detail);
    const sessionList = await adminApi.excursionSessions(id).catch(() => detail.sessions || []);
    setSessions(sessionList);
  }, [id]);

  React.useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    try {
      await bookingsApi.create(cleanPayload({
        ...form,
        excursion_id: Number(id),
        session_id: form.session_id ? Number(form.session_id) : null,
        participants_count: Number(form.participants_count)
      }));
      setStatus("Заявка создана. Менеджер свяжется с вами.");
      setForm({ session_id: "", customer_name: "", customer_phone: "", customer_email: "", participants_count: 1, comment: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !item) return <InlineState text={error} tone="error" />;
  if (!item) return <InlineState icon={<Loader2 className="spin" />} text="Загрузка экскурсии" />;

  const routePoints = sortedRoutePoints(item.route);
  return (
    <article className="excursion-page">
      <section className="route-map-hero">
        <RouteMap route={item.route} hero />
        <div className="route-map-gradient" />
        <div className="route-map-title">
          <span className="eyebrow">экскурсия</span>
          <h1>{item.title}</h1>
          <p>{item.meeting_point || "Место встречи уточняется после заявки"}</p>
          <div className="hero-facts">
            <span><strong>{Number(item.base_price).toLocaleString("ru-RU")} ₽</strong> стоимость</span>
            <span><strong>{item.duration_min || item.route?.estimated_duration_min || "—"} мин</strong> длительность</span>
            <span><strong>{item.route?.estimated_length_km || "—"} км</strong> длина</span>
            <span><strong>{item.max_participants}</strong> участников</span>
          </div>
        </div>
      </section>

      <section className="route-content-grid">
        <div className="rich-panel">
          <h2>Описание</h2>
          <p>{item.description || "Описание маршрута пока не заполнено. Менеджер может сгенерировать его через Ollama."}</p>
          <h2>Точки маршрута</h2>
          <ol className="timeline">
            {routePoints.map((link) => (
              <li key={link.id}>
                <img src={link.point?.image_url || placeholder} alt="" />
                <div>
                  <strong>{link.point?.name || `Точка ${link.point_id}`}</strong>
                  <span>{link.point?.short_description || link.note || "Точка маршрута"}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <aside className="booking-panel">
          <h2>Записаться</h2>
          <form className="stack" onSubmit={submit}>
            <div className="booking-calendar" id="dates">
              {sessions.length ? sessions.map((session) => (
                <button
                  type="button"
                  key={session.id}
                  className={String(session.id) === String(form.session_id) ? "selected" : ""}
                  onClick={() => setForm({ ...form, session_id: String(session.id) })}
                >
                  <span>{formatDate(session.session_date)}</span>
                  <strong>{session.start_time?.slice(0, 5)}</strong>
                  <small>{session.capacity} мест</small>
                </button>
              )) : <p className="muted">Доступные даты пока не добавлены.</p>}
            </div>
            <input autoComplete="name" placeholder="Имя" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            <input autoComplete="tel" placeholder="Телефон" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            <input autoComplete="email" placeholder="Email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
            <input type="number" min="1" value={form.participants_count} onChange={(e) => setForm({ ...form, participants_count: e.target.value })} />
            <textarea placeholder="Комментарий" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            <button className="button primary" disabled={!form.session_id}>Отправить заявку</button>
            {status && <p className="ok">{status}</p>}
            {error && <p className="error">{error}</p>}
          </form>
        </aside>
      </section>
    </article>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [form, setForm] = React.useState({ email: "admin@example.com", password: "admin123" });
  const [error, setError] = React.useState("");
  async function submit(event) {
    event.preventDefault();
    try {
      await auth.login(form);
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <AuthScreen title="Вход" subtitle="Введите email и пароль.">
      <form className="auth-form" onSubmit={submit}>
        <input autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input autoComplete="current-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="button primary">Войти</button>
        {error && <p className="error">{error}</p>}
      </form>
    </AuthScreen>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [form, setForm] = React.useState({ first_name: "", last_name: "", email: "", phone: "", password: "" });
  const [error, setError] = React.useState("");
  async function submit(event) {
    event.preventDefault();
    try {
      await auth.register(cleanPayload(form));
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <AuthScreen title="Регистрация" subtitle="Создайте клиентский аккаунт для бронирования.">
      <form className="auth-form" onSubmit={submit}>
        <input autoComplete="given-name" placeholder="Имя" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input autoComplete="family-name" placeholder="Фамилия" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <input autoComplete="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input autoComplete="tel" placeholder="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input autoComplete="new-password" type="password" placeholder="Пароль от 8 символов" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button className="button primary">Зарегистрироваться</button>
        {error && <p className="error">{error}</p>}
      </form>
    </AuthScreen>
  );
}

function AdminPage() {
  const auth = useAuth();
  const [tab, setTab] = React.useState("points");
  const [state, setState] = React.useState({ points: [], routes: [], excursions: [], bookings: [], sessions: [], health: [] });
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const refresh = React.useCallback(async () => {
    if (!auth.user) return;
    const [points, routes, excursions, bookings, sessions, health] = await Promise.all([
      adminApi.points(),
      adminApi.routes(),
      excursionsApi.list(),
      bookingsApi.list(),
      adminApi.sessions(),
      adminApi.health()
    ]);
    setState({ points, routes, excursions, bookings, sessions, health });
  }, [auth.user]);

  React.useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, [refresh]);

  function done(text) {
    setMessage(text);
    setError("");
    refresh().catch((err) => setError(err.message));
  }

  if (!auth.ready) return <InlineState icon={<Loader2 className="spin" />} text="Проверка сессии" />;
  if (!auth.user) {
    return (
      <section className="empty">
        <h1>Нужен вход</h1>
        <p>Управление доступно после авторизации.</p>
        <Link className="button primary" to="/login">Войти</Link>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="page-head">
        <span className="eyebrow">рабочее место</span>
        <h1>Управление GIDIX</h1>
        <p>{auth.user.email} · {auth.user.roles.join(", ")}</p>
      </div>
      <div className="metrics">
        <Metric icon={<Map />} value={state.points.length} label="точек" />
        <Metric icon={<RouteIcon />} value={state.routes.length} label="маршрутов" />
        <Metric icon={<Ticket />} value={state.excursions.length} label="экскурсий" />
        <Metric icon={<CalendarDays />} value={state.sessions.length} label="дат" />
      </div>
      <div className="tabs">
        {[
          ["points", "Точки"],
          ["routes", "Маршруты"],
          ["excursions", "Экскурсии"],
          ["sessions", "Даты"],
          ["bookings", "Заявки"],
          ["integrations", "Интеграции"]
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {message && <InlineState icon={<CheckCircle2 />} text={message} />}
      {error && <InlineState text={error} tone="error" />}
      {tab === "points" && <PointCrud points={state.points} onDone={done} onError={setError} />}
      {tab === "routes" && <RouteCrud points={state.points} routes={state.routes} onDone={done} onError={setError} />}
      {tab === "excursions" && <ExcursionCrud routes={state.routes} excursions={state.excursions} onDone={done} onError={setError} />}
      {tab === "sessions" && <SessionCrud excursions={state.excursions} sessions={state.sessions} onDone={done} onError={setError} />}
      {tab === "bookings" && <BookingsPanel bookings={state.bookings} />}
      {tab === "integrations" && <IntegrationPanel health={state.health} routes={state.routes} excursions={state.excursions} onDone={done} onError={setError} />}
    </section>
  );
}

function PointCrud({ points, onDone, onError }) {
  const empty = { name: "", short_description: "", full_description: "", address: "", latitude: "", longitude: "", visit_duration_min: 20, image_url: "" };
  const [form, setForm] = React.useState(empty);
  const [editingId, setEditingId] = React.useState(null);

  function edit(point) {
    setEditingId(point.id);
    setForm({ ...empty, ...point, latitude: String(point.latitude), longitude: String(point.longitude) });
  }

  function placeOnMap(latlng) {
    setForm((prev) => ({
      ...prev,
      latitude: latlng.lat.toFixed(7),
      longitude: latlng.lng.toFixed(7)
    }));
  }

  async function upload(file) {
    const asset = await adminApi.upload(file);
    setForm((prev) => ({ ...prev, image_url: asset.url }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.latitude || !form.longitude) {
      onError("Поставьте точку на карте");
      return;
    }
    const payload = cleanPayload({
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      visit_duration_min: Number(form.visit_duration_min),
      image_url: form.image_url || placeholder
    });
    try {
      if (editingId) await adminApi.updatePoint(editingId, payload);
      else await adminApi.createPoint(payload);
      setEditingId(null);
      setForm(empty);
      onDone(editingId ? "Точка обновлена" : "Точка добавлена");
    } catch (err) {
      onError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Удалить точку?")) return;
    try {
      await adminApi.deletePoint(id);
      onDone("Точка удалена");
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <div className="crud-layout poi-editor">
      <section className="panel poi-form">
        <h2>{editingId ? "Редактирование точки" : "Новая точка"}</h2>
        <form className="stack" onSubmit={submit}>
          <input placeholder="Название" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <textarea placeholder="Краткое описание" value={form.short_description || ""} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          <textarea placeholder="Полное описание" value={form.full_description || ""} onChange={(e) => setForm({ ...form, full_description: e.target.value })} />
          <input placeholder="Адрес" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="coordinate-readout">
            <MapPin size={17} />
            {form.latitude && form.longitude ? (
              <span>Выбрано на карте: {Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}</span>
            ) : (
              <span>Кликните по карте, чтобы выбрать координаты</span>
            )}
          </div>
          <UploadField value={form.image_url} onUpload={upload} onChange={(value) => setForm({ ...form, image_url: value })} />
          <button className="button primary"><Save size={17} /> Сохранить</button>
          {editingId && <button type="button" className="button ghost" onClick={() => { setEditingId(null); setForm(empty); }}><X size={17} /> Отмена</button>}
        </form>
      </section>
      <section className="panel map-panel">
        <div className="panel-title-row">
          <h2>Карта точек</h2>
          <span>Клик по карте задаёт координаты новой точки. Клик по маркеру открывает редактирование.</span>
        </div>
        <AdminMap
          points={points}
          selectedPosition={form.latitude && form.longitude ? [Number(form.latitude), Number(form.longitude)] : null}
          onAddPoint={placeOnMap}
          onPickPoint={edit}
        />
      </section>
      <section className="panel wide-list">
        <h2>Точки интереса</h2>
        <div className="object-grid">
          {points.map((point) => (
            <article className="object-card" key={point.id}>
              <img src={point.image_url || placeholder} alt="" />
              <div>
                <h3>{point.name}</h3>
                <p>{shortText(point.short_description || point.address || "Без описания", 100)}</p>
                <small>{point.latitude}, {point.longitude}</small>
              </div>
              <div className="card-actions">
                <button className="button ghost" onClick={() => edit(point)}><Edit3 size={16} /> Изменить</button>
                <button className="button danger" onClick={() => remove(point.id)}><Trash2 size={16} /> Удалить</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function RouteCrud({ points, routes, onDone, onError }) {
  const empty = { title: "Новый маршрут", description: "", active: true, cover_image_url: "", algorithm: "nearest_neighbor_2opt" };
  const [form, setForm] = React.useState(empty);
  const [selected, setSelected] = React.useState([]);
  const [editingId, setEditingId] = React.useState(null);
  const selectedPoints = selected.map((id) => points.find((point) => point.id === id)).filter(Boolean);

  function edit(route) {
    setEditingId(route.id);
    setForm({
      title: route.title,
      description: route.description || "",
      active: route.active,
      cover_image_url: route.route_metadata?.cover_image_url || "",
      algorithm: route.optimization_algorithm || "nearest_neighbor_2opt"
    });
    setSelected(sortedRoutePoints(route).map((link) => link.point_id));
  }

  function togglePoint(id) {
    setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  async function upload(file) {
    const asset = await adminApi.upload(file);
    setForm((prev) => ({ ...prev, cover_image_url: asset.url }));
  }

  async function saveManual(event) {
    event.preventDefault();
    const routePoints = selected.map((point_id, index) => ({ point_id, position: index + 1 }));
    const payload = {
      title: form.title,
      description: form.description,
      formation_type: "manual",
      route_metadata: { cover_image_url: form.cover_image_url },
      points: routePoints,
      active: form.active
    };
    try {
      if (editingId) await adminApi.updateRoute(editingId, payload);
      else await adminApi.createRoute(payload);
      setEditingId(null);
      setForm(empty);
      setSelected([]);
      onDone("Маршрут сохранён вручную");
    } catch (err) {
      onError(err.message);
    }
  }

  async function saveOsrm() {
    try {
      if (selected.length < 2) throw new Error("Выберите минимум две точки");
      const route = await adminApi.generateRoute({ title: form.title, point_ids: selected, algorithm: form.algorithm });
      await adminApi.updateRoute(route.id, {
        description: form.description,
        route_metadata: { ...(route.route_metadata || {}), cover_image_url: form.cover_image_url },
        active: form.active
      });
      setForm(empty);
      setSelected([]);
      onDone("Маршрут рассчитан через OSRM");
    } catch (err) {
      onError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Удалить маршрут?")) return;
    try {
      await adminApi.deleteRoute(id);
      onDone("Маршрут удалён");
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <div className="crud-layout">
      <section className="panel">
        <h2>{editingId ? "Редактирование маршрута" : "Маршрут"}</h2>
        <form className="stack" onSubmit={saveManual}>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <UploadField value={form.cover_image_url} onUpload={upload} onChange={(value) => setForm({ ...form, cover_image_url: value })} />
          <select value={form.algorithm} onChange={(e) => setForm({ ...form, algorithm: e.target.value })}>
            <option value="nearest_neighbor_2opt">nearest_neighbor_2opt</option>
            <option value="nearest_neighbor">nearest_neighbor</option>
            <option value="held_karp">held_karp</option>
            <option value="bruteforce">bruteforce</option>
          </select>
          <div className="check-list">
            {points.map((point) => (
              <label key={point.id}>
                <input type="checkbox" checked={selected.includes(point.id)} onChange={() => togglePoint(point.id)} />
                <span>{point.name}</span>
              </label>
            ))}
          </div>
          <AdminMap points={selectedPoints} onAddPoint={(latlng) => onError(`Клик по карте: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}. Создайте точку в разделе "Точки".`)} />
          <div className="action-row">
            <button className="button primary"><Save size={17} /> Сохранить вручную</button>
            <button type="button" className="button accent" onClick={saveOsrm}><Wand2 size={17} /> Рассчитать OSRM</button>
          </div>
        </form>
      </section>
      <section className="panel wide-list">
        <h2>Маршруты</h2>
        <div className="object-grid">
          {routes.map((route) => (
            <article className="object-card" key={route.id}>
              <img src={route.route_metadata?.cover_image_url || firstPointImage(route) || placeholder} alt="" />
              <div>
                <h3>{route.title}</h3>
                <p>{route.formation_type} · {route.estimated_length_km || "—"} км · {route.route_metadata?.routing_source || "manual"}</p>
              </div>
              <div className="card-actions">
                <button className="button ghost" onClick={() => edit(route)}><Edit3 size={16} /> Изменить</button>
                <button className="button danger" onClick={() => remove(route.id)}><Trash2 size={16} /> Удалить</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ExcursionCrud({ routes, excursions, onDone, onError }) {
  const empty = { title: "Новая экскурсия", description: "", route_id: "", base_price: 1200, duration_min: 120, meeting_point: "", max_participants: 20, image_url: "" };
  const [form, setForm] = React.useState(empty);
  const [editingId, setEditingId] = React.useState(null);

  function edit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || "",
      route_id: item.route_id || "",
      base_price: item.base_price,
      duration_min: item.duration_min || 120,
      meeting_point: item.meeting_point || "",
      max_participants: item.max_participants,
      image_url: item.image_url || ""
    });
  }

  async function upload(file) {
    const asset = await adminApi.upload(file);
    setForm((prev) => ({ ...prev, image_url: asset.url }));
  }

  async function submit(event) {
    event.preventDefault();
    const payload = cleanPayload({
      ...form,
      route_id: form.route_id ? Number(form.route_id) : null,
      base_price: String(form.base_price),
      duration_min: Number(form.duration_min),
      max_participants: Number(form.max_participants),
      image_url: form.image_url || placeholder
    });
    try {
      if (editingId) await adminApi.updateExcursion(editingId, payload);
      else await adminApi.createExcursion(payload);
      setEditingId(null);
      setForm(empty);
      onDone(editingId ? "Экскурсия обновлена" : "Экскурсия создана");
    } catch (err) {
      onError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Удалить экскурсию?")) return;
    try {
      await adminApi.deleteExcursion(id);
      onDone("Экскурсия удалена");
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <div className="crud-layout">
      <section className="panel">
        <h2>{editingId ? "Редактирование экскурсии" : "Экскурсия"}</h2>
        <form className="stack" onSubmit={submit}>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select value={form.route_id} onChange={(e) => setForm({ ...form, route_id: e.target.value })}>
            <option value="">Без маршрута</option>
            {routes.map((route) => <option key={route.id} value={route.id}>{route.title}</option>)}
          </select>
          <div className="two-cols">
            <input type="number" min="0" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
            <input type="number" min="1" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} />
          </div>
          <input placeholder="Место встречи" value={form.meeting_point} onChange={(e) => setForm({ ...form, meeting_point: e.target.value })} />
          <input type="number" min="1" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} />
          <UploadField value={form.image_url} onUpload={upload} onChange={(value) => setForm({ ...form, image_url: value })} />
          <button className="button primary"><Save size={17} /> Сохранить</button>
        </form>
      </section>
      <section className="panel wide-list">
        <h2>Экскурсии</h2>
        <div className="object-grid">
          {excursions.map((item) => (
            <article className="object-card" key={item.id}>
              <img src={coverForExcursion(item)} alt="" />
              <div>
                <h3>{item.title}</h3>
                <p>{Number(item.base_price).toLocaleString("ru-RU")} ₽ · дат: {item.sessions?.length || 0}</p>
              </div>
              <div className="card-actions">
                <button className="button ghost" onClick={() => edit(item)}><Edit3 size={16} /> Изменить</button>
                <button className="button danger" onClick={() => remove(item.id)}><Trash2 size={16} /> Удалить</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SessionCrud({ excursions, sessions, onDone, onError }) {
  const empty = { excursion_id: "", session_date: "", start_time: "12:00", capacity: 20, status: "scheduled" };
  const [form, setForm] = React.useState(empty);
  const [editingId, setEditingId] = React.useState(null);

  function edit(session) {
    setEditingId(session.id);
    setForm({ ...session, start_time: session.start_time?.slice(0, 5) || "12:00" });
  }

  async function submit(event) {
    event.preventDefault();
    const payload = cleanPayload({
      ...form,
      excursion_id: Number(form.excursion_id),
      capacity: Number(form.capacity),
      start_time: form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time
    });
    try {
      if (editingId) await adminApi.updateSession(editingId, payload);
      else await adminApi.createSession(payload);
      setEditingId(null);
      setForm(empty);
      onDone(editingId ? "Дата обновлена" : "Дата добавлена");
    } catch (err) {
      onError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Удалить дату?")) return;
    try {
      await adminApi.deleteSession(id);
      onDone("Дата удалена");
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <div className="crud-layout">
      <section className="panel">
        <h2>{editingId ? "Редактирование даты" : "Дата записи"}</h2>
        <form className="stack" onSubmit={submit}>
          <select value={form.excursion_id} onChange={(e) => setForm({ ...form, excursion_id: e.target.value })} required>
            <option value="">Выберите экскурсию</option>
            {excursions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <div className="two-cols">
            <input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} required />
            <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
          </div>
          <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="scheduled">scheduled</option>
            <option value="active">active</option>
            <option value="cancelled">cancelled</option>
            <option value="completed">completed</option>
          </select>
          <button className="button primary"><CalendarDays size={17} /> Сохранить дату</button>
        </form>
      </section>
      <section className="panel wide-list">
        <h2>Даты</h2>
        <table>
          <thead><tr><th>Экскурсия</th><th>Дата</th><th>Время</th><th>Мест</th><th></th></tr></thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{excursions.find((item) => item.id === session.excursion_id)?.title || session.excursion_id}</td>
                <td>{formatDate(session.session_date)}</td>
                <td>{session.start_time?.slice(0, 5)}</td>
                <td>{session.capacity}</td>
                <td className="table-actions">
                  <button className="button ghost" onClick={() => edit(session)}><Edit3 size={15} /></button>
                  <button className="button danger" onClick={() => remove(session.id)}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function IntegrationPanel({ health, routes, excursions, onDone, onError }) {
  async function generateRouteText(routeId) {
    try {
      await adminApi.generateDescription(routeId);
      onDone("Текст маршрута сгенерирован через Ollama");
    } catch (err) {
      onError(err.message);
    }
  }
  async function generateExcursionText(excursionId) {
    try {
      await excursionsApi.generateDescription(excursionId);
      onDone("Описание экскурсии сгенерировано через Ollama");
    } catch (err) {
      onError(err.message);
    }
  }
  return (
    <section className="panel">
      <h2><Sparkles size={18} /> Интеграции</h2>
      <table>
        <thead><tr><th>Сервис</th><th>Флаг</th><th>Адрес</th></tr></thead>
        <tbody>{health.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.enabled ? "включен" : "выключен"}</td><td>{item.detail}</td></tr>)}</tbody>
      </table>
      <div className="action-row">
        {routes.map((route) => <button className="button accent" key={route.id} onClick={() => generateRouteText(route.id)}><Wand2 size={16} /> Ollama: {route.title}</button>)}
        {excursions.map((item) => <button className="button accent" key={item.id} onClick={() => generateExcursionText(item.id)}><Wand2 size={16} /> Описание: {item.title}</button>)}
      </div>
    </section>
  );
}

function BookingsPanel({ bookings }) {
  return (
    <section className="panel">
      <h2><CalendarDays size={18} /> Заявки</h2>
      <table>
        <thead><tr><th>Клиент</th><th>Контакты</th><th>Участники</th><th>Дата</th><th>Статус</th></tr></thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>{booking.customer_name}</td>
              <td>{booking.customer_phone || booking.customer_email || "—"}</td>
              <td>{booking.participants_count}</td>
              <td>{booking.session_id || "—"}</td>
              <td>{booking.status} / {booking.payment_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RouteMap({ route, hero = false }) {
  const routePoints = sortedRoutePoints(route);
  const osrm = route?.geometry_geojson?.coordinates?.map(([lon, lat]) => [lat, lon]) || [];
  const manual = routePoints
    .filter((link) => link.point?.latitude && link.point?.longitude)
    .map((link) => [Number(link.point.latitude), Number(link.point.longitude)]);
  const line = osrm.length > 1 ? osrm : manual;
  const center = line[0] || [54.7351, 55.9587];
  return (
    <MapContainer key={`${center[0]}-${center[1]}-${line.length}-${hero}`} center={center} zoom={hero ? 13 : 12} scrollWheelZoom className={hero ? "hero-map" : "map"} attributionControl={false}>
      <TileLayer attribution="" url={tileUrl} />
      <FitMapToPositions positions={line} />
      {manual.length > 1 && <Polyline positions={manual} pathOptions={{ color: "#3cb63a", weight: 9, opacity: 0.22, lineCap: "round" }} />}
      {line.length > 1 && <Polyline positions={line} pathOptions={{ color: "#207bfb", weight: 5, opacity: 0.92, lineCap: "round" }} />}
      {routePoints.map((link, index) => (
        <Marker key={link.id || index} position={[Number(link.point?.latitude), Number(link.point?.longitude)]} icon={index === 0 ? activeMarkerIcon : markerIcon}>
          <Tooltip>{index + 1}. {link.point?.name}</Tooltip>
          <Popup><strong>{link.point?.name}</strong><p>{link.point?.short_description}</p></Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function AdminMap({ points, onAddPoint, onPickPoint, selectedPosition = null }) {
  const center = selectedPosition || (points[0] ? [Number(points[0].latitude), Number(points[0].longitude)] : [54.7351, 55.9587]);
  const line = points.map((point) => [Number(point.latitude), Number(point.longitude)]);
  const boundsPoints = selectedPosition ? [...line, selectedPosition] : line;
  return (
    <MapContainer center={center} zoom={12} className="admin-map" scrollWheelZoom attributionControl={false}>
      <TileLayer attribution="" url={tileUrl} />
      <MapClick onAddPoint={onAddPoint} />
      <FitMapToPositions positions={boundsPoints} />
      {line.length > 1 && <Polyline positions={line} pathOptions={{ color: "#207bfb", weight: 4 }} />}
      {points.map((point, index) => (
        <Marker
          key={point.id}
          position={[Number(point.latitude), Number(point.longitude)]}
          icon={markerIcon}
          eventHandlers={{ click: () => onPickPoint?.(point) }}
        >
          <Tooltip>{index + 1}. {point.name}</Tooltip>
          <Popup><strong>{point.name}</strong><p>{point.short_description || point.address}</p></Popup>
        </Marker>
      ))}
      {selectedPosition && (
        <Marker position={selectedPosition} icon={activeMarkerIcon}>
          <Tooltip>Выбранная позиция</Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}

function FitMapToPositions({ positions }) {
  const map = useMap();
  React.useEffect(() => {
    const valid = positions.filter((position) => Number.isFinite(position?.[0]) && Number.isFinite(position?.[1]));
    if (valid.length > 1) map.fitBounds(valid, { padding: [40, 40], maxZoom: 15 });
    else if (valid.length === 1) map.setView(valid[0], 14);
  }, [map, positions]);
  return null;
}

function MapClick({ onAddPoint }) {
  useMapEvents({
    click: (event) => onAddPoint?.({ lat: event.latlng.lat, lng: event.latlng.lng })
  });
  return null;
}

function UploadField({ value, onUpload, onChange }) {
  return (
    <div className="upload-field">
      <input placeholder="URL изображения" value={value || ""} onChange={(e) => onChange(e.target.value)} />
      <label className="button ghost">
        <ImagePlus size={17} /> Фото
        <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      </label>
    </div>
  );
}

function AuthScreen({ title, subtitle, children }) {
  return (
    <div className="auth-screen">
      <section className="auth-panel">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </section>
    </div>
  );
}

function Metric({ icon, value, label }) {
  return <div>{icon}<strong>{value}</strong><span>{label}</span></div>;
}

function InlineState({ icon, text, tone = "ok" }) {
  return <div className={`inline-state ${tone}`}>{icon}{text}</div>;
}

function cleanPayload(payload) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, value === "" ? null : value]));
}

function sortedRoutePoints(route) {
  return [...(route?.points || [])].sort((a, b) => a.position - b.position);
}

function coverForExcursion(item) {
  return item.image_url || item.route?.route_metadata?.cover_image_url || firstPointImage(item.route) || placeholder;
}

function firstPointImage(route) {
  return sortedRoutePoints(route).find((link) => link.point?.image_url)?.point?.image_url;
}

function shortText(text, max) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

createRoot(document.getElementById("root")).render(<App />);
