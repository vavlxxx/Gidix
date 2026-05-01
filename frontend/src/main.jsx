import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, LogIn, Map, Route as RouteIcon, Settings, Ticket } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./styles/tokens.css";
import "./styles/globals.css";
import { adminApi, authApi, bookingsApi, excursionsApi, setAccessToken } from "./api/client";

function App() {
  return (
    <BrowserRouter>
      <div className="shell">
        <aside className="sidebar">
          <Link className="brand" to="/">GIDIX</Link>
          <NavLink to="/"><Ticket size={18} /> Экскурсии</NavLink>
          <NavLink to="/admin"><Settings size={18} /> Управление</NavLink>
          <NavLink to="/login"><LogIn size={18} /> Вход</NavLink>
        </aside>
        <main className="content">
          <Routes>
            <Route path="/" element={<ExcursionsPage />} />
            <Route path="/excursions/:id" element={<ExcursionDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function ExcursionsPage() {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    excursionsApi.list().then(setItems).catch(() => setItems([]));
  }, []);
  return (
    <>
      <div className="page-head">
        <h1>Экскурсии</h1>
        <p>Каталог доступных маршрутов и заявок GIDIX.</p>
      </div>
      <div className="grid">
        {items.map((item) => (
          <Link className="card" key={item.id} to={`/excursions/${item.id}`}>
            <img src={item.image_url || import.meta.env.VITE_PLACEHOLDER_IMAGE || "https://placehold.co/600x400/EEE/31343C"} alt="" />
            <div>
              <h2>{item.title}</h2>
              <p>{item.description || "Описание появится после генерации или ручного заполнения."}</p>
              <span>{Number(item.base_price).toLocaleString("ru-RU")} ₽</span>
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
  const [form, setForm] = React.useState({ customer_name: "", customer_phone: "", customer_email: "", participants_count: 1 });
  const [status, setStatus] = React.useState("");
  React.useEffect(() => {
    excursionsApi.get(id).then(setItem);
  }, [id]);
  async function submit(event) {
    event.preventDefault();
    await bookingsApi.create({ ...form, excursion_id: Number(id), participants_count: Number(form.participants_count) });
    setStatus("Заявка создана");
  }
  if (!item) return <p>Загрузка...</p>;
  return (
    <div className="detail">
      <section>
        <h1>{item.title}</h1>
        <p>{item.description}</p>
        {item.route?.geometry_geojson && <pre className="geo">{JSON.stringify(item.route.geometry_geojson, null, 2)}</pre>}
      </section>
      <form className="panel" onSubmit={submit}>
        <h2>Бронирование</h2>
        <input placeholder="Имя" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
        <input placeholder="Телефон" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
        <input placeholder="Email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
        <input type="number" min="1" value={form.participants_count} onChange={(e) => setForm({ ...form, participants_count: e.target.value })} />
        <button>Отправить</button>
        {status && <p className="ok">{status}</p>}
      </form>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ email: "admin@example.com", password: "admin123" });
  const [error, setError] = React.useState("");
  async function submit(event) {
    event.preventDefault();
    try {
      const data = await authApi.login(form);
      setAccessToken(data.access_token);
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <form className="panel narrow" onSubmit={submit}>
      <h1>Вход</h1>
      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button>Войти</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

function AdminPage() {
  const [points, setPoints] = React.useState([]);
  const [routes, setRoutes] = React.useState([]);
  const [health, setHealth] = React.useState([]);
  React.useEffect(() => {
    adminApi.points().then(setPoints).catch(() => setPoints([]));
    adminApi.routes().then(setRoutes).catch(() => setRoutes([]));
    adminApi.health().then(setHealth).catch(() => setHealth([]));
  }, []);
  return (
    <>
      <div className="page-head">
        <h1>Управление</h1>
        <p>Операционная панель маршрутов, точек и интеграций.</p>
      </div>
      <div className="metrics">
        <div><Map /> <strong>{points.length}</strong><span>точек</span></div>
        <div><RouteIcon /> <strong>{routes.length}</strong><span>маршрутов</span></div>
        <div><CalendarDays /> <strong>{health.length}</strong><span>интеграций</span></div>
      </div>
      <table>
        <thead><tr><th>Интеграция</th><th>Статус</th><th>Адрес</th></tr></thead>
        <tbody>{health.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.enabled ? "включена" : "выключена"}</td><td>{item.detail}</td></tr>)}</tbody>
      </table>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
