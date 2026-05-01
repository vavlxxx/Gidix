import React, { useEffect, useState } from "react";

import { apiFetch } from "../api";
import { useToast } from "../context/ToastContext";

export default function AdminIntegrations() {
  const { notify } = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch("/api/integrations/status")
      .then((data) => setStatus(data))
      .catch((err) => notify({ type: "error", title: "Не удалось проверить интеграции", message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const serviceState = (service) => {
    if (!service) return "Не проверен";
    if (service.available) return "Доступен";
    return service.error || `HTTP ${service.status_code}`;
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Интеграции</h1>
          <p>Адреса сервисов берутся из переменных окружения, здесь отображается текущая проверка доступности.</p>
        </div>
        <button className="button ghost" type="button" onClick={load} disabled={loading}>
          {loading ? "Проверка..." : "Обновить"}
        </button>
      </div>

      {status && (
        <div className="integration-grid">
          <article className="integration-card">
            <h3>OSRM</h3>
            <p>{status.osrm.base_url}</p>
            <strong>{serviceState(status.osrm)}</strong>
            <span>Профиль: {status.osrm.profile}</span>
          </article>
          <article className="integration-card">
            <h3>Ollama</h3>
            <p>{status.ollama.base_url}</p>
            <strong>{serviceState(status.ollama)}</strong>
            <span>Модель: {status.ollama.model}</span>
          </article>
          <article className="integration-card">
            <h3>Overpass</h3>
            <p>{status.overpass.url}</p>
            <strong>{status.osm_import_enabled ? "Включен" : "Отключен"}</strong>
            <span>Таймаут: {status.overpass.timeout_seconds} сек.</span>
          </article>
          <article className="integration-card">
            <h3>Feature flags</h3>
            <p>Маршруты: {status.route_generation_enabled ? "включены" : "отключены"}</p>
            <p>LLM: {status.llm_description_enabled ? "включена" : "отключена"}</p>
            <p>Mock-оплата: {status.payments_mock_enabled ? "включена" : "отключена"}</p>
          </article>
        </div>
      )}
    </div>
  );
}
