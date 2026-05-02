import React from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { adminApi, mediaUrl } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState, LoadingState } from "../../components/ui/State";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";
import { coverForExcursion, money } from "../../utils/format";

export function ExcursionsPage() {
  const notify = useToast();
  const { state, loading, refresh } = useAdminData();

  async function remove(id) {
    if (!confirm("Удалить экскурсию?")) return;
    try {
      await adminApi.deleteExcursion(id);
      notify.success("Экскурсия удалена.");
      refresh();
    } catch (err) {
      notify.error(err.message);
    }
  }

  const columns = [
    { key: "image", title: "Фото", render: (row) => <img className="table-thumb" src={mediaUrl(coverForExcursion(row))} alt="" /> },
    {
      key: "title",
      title: "Экскурсия",
      render: (row) => (
        <div className="table-title-cell">
          <strong>{row.title}</strong>
          <span>{row.description || "Описание пока не заполнено"}</span>
        </div>
      )
    },
    { key: "price", title: "Цена", render: (row) => money(row.base_price) },
    { key: "route", title: "Маршрут", render: (row) => row.route?.title || "не выбран" },
    { key: "state", title: "Состояние", render: (row) => <span className={`status-pill status-pill--${row.active === false ? "cancelled" : "completed"}`}>{row.active === false ? "Скрыта" : "Опубликована"}</span> },
    {
      key: "actions",
      title: "Действия",
      render: (row) => (
        <div className="actions-row">
          <Button as="link" to={`/admin/excursions/${row.id}/edit`}><Edit3 size={15} /> Редактировать</Button>
          <Button type="button" tone="danger" onClick={() => remove(row.id)}><Trash2 size={15} /> Удалить</Button>
        </div>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Экскурсии"
        title="Программы для публикации"
        description="Экскурсии редактируются на отдельных страницах: так проще проверить маршрут, цену, фото и расписание перед публикацией."
        actions={<Button as="link" to="/admin/excursions/new" tone="primary"><Plus size={17} /> Новая экскурсия</Button>}
      />
      {loading && <LoadingState text="Загрузка экскурсий" />}
      {!loading && !state.excursions.length ? (
        <EmptyState title="Экскурсий пока нет" text="Создайте первую программу и привяжите к ней маршрут." action={<Link className="button button--primary" to="/admin/excursions/new">Создать экскурсию</Link>} />
      ) : (
        <DataTable columns={columns} rows={state.excursions} emptyText="Экскурсий пока нет" />
      )}
    </div>
  );
}
