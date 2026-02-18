import React, { useEffect, useState } from "react";

import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const emptyForm = {
  title: "",
  description: "",
  multiplier: "1.0"
};

export default function AdminTariffs() {
  const { notify } = useToast();
  const { user } = useAuth();
  const [tariffs, setTariffs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const canManage = user && ["manager", "admin", "superuser"].includes(user.role);

  const loadTariffs = () => {
    setLoading(true);
    apiFetch("/api/tariffs/")
      .then((data) => setTariffs(data))
      .catch((err) =>
        notify({
          type: "error",
          title: "Не удалось загрузить тарифы",
          message: err.message
        })
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (canManage) {
      loadTariffs();
    }
  }, [canManage]);

  if (!canManage) {
    return (
      <div className="admin-page">
        <h1>Тарифы</h1>
        <p>Доступно только для менеджеров и администраторов.</p>
      </div>
    );
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      await apiFetch("/api/tariffs/", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          multiplier: Number(form.multiplier)
        })
      });
      setForm(emptyForm);
      loadTariffs();
      notify({
        type: "success",
        title: "Тариф добавлен"
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Ошибка создания тарифа",
        message: err.message
      });
    }
  };

  const handleTariffChange = (tariffId, field, value) => {
    setTariffs((prev) =>
      prev.map((item) =>
        item.id === tariffId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleUpdate = async (tariffId) => {
    const target = tariffs.find((item) => item.id === tariffId);
    if (!target) return;
    setSavingId(tariffId);
    try {
      const updated = await apiFetch(`/api/tariffs/${tariffId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: target.title.trim(),
          description: target.description?.trim() || null,
          multiplier: Number(target.multiplier)
        })
      });
      setTariffs((prev) => prev.map((item) => (item.id === tariffId ? updated : item)));
      notify({
        type: "success",
        title: "Тариф обновлен"
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Ошибка обновления тарифа",
        message: err.message
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (tariffId) => {
    if (!window.confirm("Удалить тариф?")) {
      return;
    }
    setSavingId(tariffId);
    try {
      await apiFetch(`/api/tariffs/${tariffId}`, { method: "DELETE" });
      setTariffs((prev) => prev.filter((item) => item.id !== tariffId));
      notify({
        type: "success",
        title: "Тариф удален"
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Ошибка удаления тарифа",
        message: err.message
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Тарифы</h1>
          <p>Настройте варианты цены для экскурсий.</p>
        </div>
        <div className="admin-header-actions">
          <button className="button ghost" type="button" onClick={loadTariffs}>
            Обновить
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h3>Добавить тариф</h3>
        <form className="form-grid" onSubmit={handleCreate}>
          <label>
            Название
            <input name="title" value={form.title} onChange={handleFormChange} required />
          </label>
          <label>
            Множитель цены
            <input
              type="number"
              name="multiplier"
              step="0.05"
              min="0.1"
              value={form.multiplier}
              onChange={handleFormChange}
              required
            />
          </label>
          <label className="full">
            Описание
            <textarea
              name="description"
              rows="3"
              value={form.description}
              onChange={handleFormChange}
            />
          </label>
          <button className="button primary" type="submit">
            Создать
          </button>
        </form>
      </div>

      {loading && <p>Загрузка...</p>}
      {!loading && tariffs.length === 0 && <p>Тарифов пока нет.</p>}

      <div className="tariff-grid">
        {tariffs.map((tariff) => (
          <div key={tariff.id} className="tariff-card admin-card">
            <div className="tariff-card-header">
              <h3>#{tariff.id}</h3>
              <span>× {Number(tariff.multiplier).toFixed(2)}</span>
            </div>
            <label>
              Название
              <input
                value={tariff.title}
                onChange={(event) => handleTariffChange(tariff.id, "title", event.target.value)}
              />
            </label>
            <label>
              Множитель
              <input
                type="number"
                step="0.05"
                min="0.1"
                value={tariff.multiplier}
                onChange={(event) => handleTariffChange(tariff.id, "multiplier", event.target.value)}
              />
            </label>
            <label>
              Описание
              <textarea
                rows="3"
                value={tariff.description || ""}
                onChange={(event) => handleTariffChange(tariff.id, "description", event.target.value)}
              />
            </label>
            <div className="admin-card-actions">
              <button
                className="button primary"
                type="button"
                onClick={() => handleUpdate(tariff.id)}
                disabled={savingId === tariff.id}
              >
                {savingId === tariff.id ? "Сохранение..." : "Сохранить"}
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={() => handleDelete(tariff.id)}
                disabled={savingId === tariff.id}
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
