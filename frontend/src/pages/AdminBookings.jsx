import React, { useEffect, useState } from "react";

import { apiFetch } from "../api";
import BookingModal from "../components/BookingModal";

const statusLabels = {
  new: "Новая",
  in_progress: "В обработке",
  confirmed: "Подтверждена",
  canceled: "Отменена"
};

export default function AdminBookings() {
  const [routes, setRoutes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    route_id: "",
    date_from: "",
    date_to: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const loadRoutes = () => {
    apiFetch("/api/routes/?include_unpublished=true").then((data) => setRoutes(data));
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.route_id) params.set("route_id", filters.route_id);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  const loadBookings = () => {
    setLoading(true);
    setError("");
    apiFetch(`/api/bookings/${buildQuery()}`)
      .then((data) => setBookings(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRoutes();
    loadBookings();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpen = async (bookingId) => {
    try {
      const detail = await apiFetch(`/api/bookings/${bookingId}`);
      setSelected(detail);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async (payload) => {
    if (!selected) return;
    try {
      await apiFetch(`/api/bookings/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setSelected(null);
      loadBookings();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Заявки клиентов</h1>
          <p>Управляйте статусами и отслеживайте обращения.</p>
        </div>
        <button className="button ghost" type="button" onClick={loadBookings}>
          Обновить
        </button>
      </div>

      <div className="filter-bar">
        <input
          name="search"
          placeholder="Поиск по имени, телефону или номеру"
          value={filters.search}
          onChange={handleFilterChange}
        />
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">Все статусы</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select name="route_id" value={filters.route_id} onChange={handleFilterChange}>
          <option value="">Все маршруты</option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.title}
            </option>
          ))}
        </select>
        <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} />
        <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} />
        <button className="button primary" type="button" onClick={loadBookings}>
          Применить
        </button>
      </div>

      {loading && <p>Загрузка...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && bookings.length === 0 && (
        <p>Заявок пока нет. Они появятся после отправки через сайт.</p>
      )}

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Номер</th>
              <th>Дата</th>
              <th>Клиент</th>
              <th>Маршрут</th>
              <th>Дата экскурсии</th>
              <th>Участники</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} onClick={() => handleOpen(booking.id)}>
                <td>{booking.code}</td>
                <td>{new Date(booking.created_at).toLocaleString("ru-RU")}</td>
                <td>{booking.client_name}</td>
                <td>{booking.route_title}</td>
                <td>{new Date(booking.desired_date).toLocaleDateString("ru-RU")}</td>
                <td>{booking.participants}</td>
                <td>
                  <span className={`status-tag ${booking.status}`}>{statusLabels[booking.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <BookingModal
          booking={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
