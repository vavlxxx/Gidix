import React, { useEffect, useState } from "react";

import { apiFetch } from "../api";
import { useToast } from "../context/ToastContext";

const emptyPoint = {
  category_id: "",
  name: "",
  short_description: "",
  full_description: "",
  lat: 54.7249,
  lon: 55.9442,
  active: true,
  source: "manual",
  source_url: ""
};

export default function AdminPoints() {
  const { notify } = useToast();
  const [categories, setCategories] = useState([]);
  const [points, setPoints] = useState([]);
  const [point, setPoint] = useState(emptyPoint);
  const [categoryName, setCategoryName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState("idle");

  const load = () => {
    setStatus("loading");
    Promise.all([
      apiFetch("/api/points/categories"),
      apiFetch("/api/points/?include_inactive=true")
    ])
      .then(([categoryData, pointData]) => {
        setCategories(categoryData);
        setPoints(pointData);
      })
      .catch((err) =>
        notify({ type: "error", title: "Не удалось загрузить точки интереса", message: err.message })
      )
      .finally(() => setStatus("idle"));
  };

  useEffect(() => {
    load();
  }, []);

  const handlePointChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPoint((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const resetPoint = () => {
    setPoint(emptyPoint);
    setEditingId(null);
  };

  const savePoint = async (event) => {
    event.preventDefault();
    const payload = {
      ...point,
      category_id: point.category_id ? Number(point.category_id) : null,
      lat: Number(point.lat),
      lon: Number(point.lon)
    };
    try {
      await apiFetch(editingId ? `/api/points/${editingId}` : "/api/points/", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
      notify({ type: "success", title: editingId ? "Точка обновлена" : "Точка создана" });
      resetPoint();
      load();
    } catch (err) {
      notify({ type: "error", title: "Ошибка сохранения точки", message: err.message });
    }
  };

  const createCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      await apiFetch("/api/points/categories", {
        method: "POST",
        body: JSON.stringify({ name: categoryName.trim() })
      });
      setCategoryName("");
      load();
      notify({ type: "success", title: "Категория добавлена" });
    } catch (err) {
      notify({ type: "error", title: "Ошибка создания категории", message: err.message });
    }
  };

  const importOverpass = async () => {
    setStatus("importing");
    try {
      const result = await apiFetch("/api/points/import/overpass", {
        method: "POST",
        body: JSON.stringify({ activate: false, limit: 80 })
      });
      notify({
        type: "success",
        title: "Импорт OSM завершен",
        message: `Создано: ${result.created_count}, пропущено: ${result.skipped_count}`
      });
      load();
    } catch (err) {
      notify({ type: "error", title: "Ошибка импорта OSM", message: err.message });
    } finally {
      setStatus("idle");
    }
  };

  const editPoint = (item) => {
    setEditingId(item.id);
    setPoint({
      category_id: item.category_id || "",
      name: item.name,
      short_description: item.short_description || "",
      full_description: item.full_description || "",
      lat: item.lat,
      lon: item.lon,
      active: item.active,
      source: item.source || "manual",
      source_url: item.source_url || ""
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Точки интереса</h1>
          <p>Справочник POI для маршрутов, импорта OSM и генерации описаний.</p>
        </div>
        <button className="button ghost" type="button" onClick={importOverpass} disabled={status === "importing"}>
          {status === "importing" ? "Импорт..." : "Импорт OSM по bbox Уфы"}
        </button>
      </div>

      <div className="admin-split">
        <form className="admin-panel" onSubmit={savePoint}>
          <h3>{editingId ? "Редактирование точки" : "Новая точка"}</h3>
          <label>
            Название
            <input name="name" value={point.name} onChange={handlePointChange} required />
          </label>
          <label>
            Категория
            <select name="category_id" value={point.category_id} onChange={handlePointChange}>
              <option value="">Без категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Краткое описание
            <textarea name="short_description" rows="3" value={point.short_description} onChange={handlePointChange} />
          </label>
          <label>
            Факты для ИИ
            <textarea name="full_description" rows="5" value={point.full_description} onChange={handlePointChange} />
          </label>
          <div className="form-grid form-grid--compact">
            <label>
              Широта
              <input type="number" step="0.000001" name="lat" value={point.lat} onChange={handlePointChange} />
            </label>
            <label>
              Долгота
              <input type="number" step="0.000001" name="lon" value={point.lon} onChange={handlePointChange} />
            </label>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" name="active" checked={point.active} onChange={handlePointChange} />
            Активна
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              Сохранить
            </button>
            {editingId && (
              <button className="button ghost" type="button" onClick={resetPoint}>
                Отмена
              </button>
            )}
          </div>
        </form>

        <div className="admin-panel">
          <h3>Категории</h3>
          <div className="inline-form">
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Новая категория" />
            <button className="button ghost" type="button" onClick={createCategory}>
              Добавить
            </button>
          </div>
          <div className="tag-list">
            {categories.map((category) => (
              <span key={category.id} className="tag-pill">
                {category.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-table">
        <div className="admin-table-row admin-table-head">
          <span>Название</span>
          <span>Категория</span>
          <span>Координаты</span>
          <span>Статус</span>
          <span />
        </div>
        {points.map((item) => (
          <div className="admin-table-row" key={item.id}>
            <span>{item.name}</span>
            <span>{item.category?.name || "Без категории"}</span>
            <span>{item.lat.toFixed(5)}, {item.lon.toFixed(5)}</span>
            <span>{item.active ? "Активна" : "Черновик"}</span>
            <button className="button ghost" type="button" onClick={() => editPoint(item)}>
              Редактировать
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
