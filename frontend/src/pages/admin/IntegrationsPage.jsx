import React from "react";
import { RefreshCcw, Sparkles, Wand2 } from "lucide-react";
import { adminApi, excursionsApi } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/State";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";

export function IntegrationsPage() {
  const notify = useToast();
  const { state, loading, refresh } = useAdminData();
  const [running, setRunning] = React.useState("");

  async function run(key, action, message) {
    setRunning(key);
    try {
      await action();
      notify.success(message);
      refresh();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setRunning("");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="IT-специалист"
        title="Состояние интеграций"
        description="Проверка подключений OSRM, LLM, поиска фактов и импорта OSM."
        actions={<Button type="button" tone="neutral" onClick={refresh}><RefreshCcw size={17} /> Проверить</Button>}
      />
      {loading && <LoadingState text="Проверка интеграций" />}
      <section className="admin-columns">
        <DataTable columns={[
          { key: "name", title: "Сервис", render: (row) => serviceTitle(row.name) },
          { key: "enabled", title: "Статус", render: (row) => row.enabled ? "включён" : "выключен" },
          { key: "detail", title: "Адрес / состояние", render: (row) => <><strong>{row.detail || "—"}</strong><br /><span className="muted-text">{row.url || row.model || "локальная настройка"}</span></> },
          { key: "action", title: "Проверка", render: () => <Button type="button" tone="neutral" onClick={refresh}><RefreshCcw size={15} /> Проверить</Button> }
        ]} rows={state.health} emptyText="Нет данных о сервисах" />
        <section className="panel stack">
          <h2><Sparkles size={18} /> Генерация описаний</h2>
          {running && <LoadingState text="Запрос принят, идёт обработка" />}
          {state.routes.map((route) => <Button key={route.id} type="button" disabled={Boolean(running)} onClick={() => run(`route-${route.id}`, () => adminApi.generateDescription(route.id), "Описание маршрута сгенерировано.")}><Wand2 size={16} /> Маршрут: {route.title}</Button>)}
          {state.excursions.map((item) => <Button key={item.id} type="button" disabled={Boolean(running)} onClick={() => run(`excursion-${item.id}`, () => excursionsApi.generateDescription(item.id), "Описание экскурсии сгенерировано.")}><Wand2 size={16} /> Экскурсия: {item.title}</Button>)}
        </section>
      </section>
    </div>
  );
}

function serviceTitle(name) {
  return ({
    osrm: "OSRM",
    llm: "LLM",
    ollama: "LLM",
    fact_search: "Поиск фактов",
    osm_import: "Импорт OSM",
    overpass: "Overpass"
  })[name] || name;
}
