import React, { useEffect, useState } from "react";

import { apiFetch } from "../api";
import { useToast } from "../context/ToastContext";

const emptyExcursion = {
  title: "",
  description: "",
  base_price: 1500,
  max_participants: 15,
  published: false,
  route_ids: []
};

export default function AdminExcursions() {
  const { notify } = useToast();
  const [items, setItems] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [form, setForm] = useState(emptyExcursion);
  const [editingId, setEditingId] = useState(null);

  const load = () => {
    Promise.all([
      apiFetch("/api/excursions/?include_unpublished=true"),
      apiFetch("/api/routes/?include_unpublished=true")
    ])
      .then(([excursionData, routeData]) => {
        setItems(excursionData);
        setRoutes(routeData);
      })
      .catch((err) => notify({ type: "error", title: "Не удалось загрузить экскурсии", message: err.message }));
  };

  useEffect(() => {
    load();
  }, []);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleRoute = (routeId) => {
    setForm((prev) => ({
      ...prev,
      route_ids: prev.route_ids.includes(routeId)
        ? prev.route_ids.filter((id) => id !== routeId)
        : [...prev.route_ids, routeId]
    }));
  };

  const edit = async (item) => {
    try {
      const detail = await apiFetch(`/api/excursions/${item.id}`);
      setEditingId(item.id);
      setForm({
        title: detail.title,
        description: detail.description,
        base_price: detail.base_price,
        max_participants: detail.max_participants,
        published: detail.published,
        route_ids: detail.routes.map((link) => link.route_id)
      });
    } catch (err) {
      notify({ type: "error", title: "Не удалось открыть экскурсию", message: err.message });
    }
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyExcursion);
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      base_price: Number(form.base_price),
      max_participants: Number(form.max_participants)
    };
    try {
      await apiFetch(editingId ? `/api/excursions/${editingId}` : "/api/excursions/", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
      notify({ type: "success", title: editingId ? "Экскурсия обновлена" : "Экскурсия создана" });
      reset();
      load();
    } catch (err) {
      notify({ type: "error", title: "Ошибка сохранения экскурсии", message: err.message });
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Экскурсии</h1>
          <p>Публичные программы, к которым привязываются рассчитанные маршруты и сеансы.</p>
        </div>
      </div>

      <div className="admin-split">
        <form className="admin-panel" onSubmit={save}>
          <h3>{editingId ? "Редактирование экскурсии" : "Новая экскурсия"}</h3>
          <label>
            Название
            <input name="title" value={form.title} onChange={change} required />
          </label>
          <label>
            Описание
            <textarea name="description" rows="6" value={form.description} onChange={change} required />
          </label>
          <div className="form-grid form-grid--compact">
            <label>
              Базовая цена
              <input type="number" name="base_price" value={form.base_price} onChange={change} min="0" />
            </label>
            <label>
              Размер группы
              <input type="number" name="max_participants" value={form.max_participants} onChange={change} min="1" />
            </label>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" name="published" checked={form.published} onChange={change} />
            Опубликована
          </label>
          <div className="route-checkbox-list">
            {routes.map((route) => (
              <label key={route.id} className="checkbox-card">
                <input
                  type="checkbox"
                  checked={form.route_ids.includes(route.id)}
                  onChange={() => toggleRoute(route.id)}
                />
                <span>{route.title}</span>
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button className="button primary" type="submit">
              Сохранить
            </button>
            {editingId && (
              <button className="button ghost" type="button" onClick={reset}>
                Отмена
              </button>
            )}
          </div>
        </form>

        <div className="admin-panel">
          <h3>Список программ</h3>
          <div className="compact-list">
            {items.map((item) => (
              <article key={item.id} className="compact-list-item">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.route_count} маршрут(ов), до {item.max_participants} чел.</span>
                  <small>{item.published ? "Опубликована" : "Черновик"}</small>
                </div>
                <button className="button ghost" type="button" onClick={() => edit(item)}>
                  Редактировать
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
