import { Edit3, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { adminApi, mediaUrl } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState, LoadingState } from "../../components/ui/State";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";
import { km, mediaGallery, minutes, placeholderImage } from "../../utils/format";

export function RoutesPage() {
  const notify = useToast();
  const { state, loading, refresh } = useAdminData();

  async function remove(id) {
    if (!confirm("Удалить маршрут?")) return;
    try {
      await adminApi.deleteRoute(id);
      notify.success("Маршрут удалён.");
      refresh();
    } catch (err) {
      notify.error(err.message);
    }
  }

  const columns = [
    { key: "image", title: "Фото", render: (row) => <img className="table-thumb" src={mediaUrl(mediaGallery(row)[0] || row.route_metadata?.cover_image_url || placeholderImage)} alt="" /> },
    {
      key: "title",
      title: "Маршрут",
      render: (row) => (
        <div className="table-title-cell">
          <strong>{row.title}</strong>
          <span>{row.description || "Описание пока не заполнено"}</span>
        </div>
      )
    },
    { key: "points", title: "Точки", render: (row) => row.points?.length || 0 },
    { key: "length", title: "Длина", render: (row) => km(row.estimated_length_km) },
    { key: "duration", title: "Время", render: (row) => minutes(row.estimated_duration_min) },
    {
      key: "actions",
      title: "Действия",
      render: (row) => (
        <div className="actions-row">
          <Button as="link" to={`/admin/routes/${row.id}/edit`}><Edit3 size={15} /> Редактировать</Button>
          <Button type="button" tone="danger" onClick={() => remove(row.id)}><Trash2 size={15} /> Удалить</Button>
        </div>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Маршруты"
        title="Список маршрутов"
        description="Здесь хранятся маршруты с GeoJSON-линиями, точками посещения и медиа для программ экскурсий."
        actions={<Button as="link" to="/admin/routes/new" tone="primary"><Plus size={17} /> Создать маршрут</Button>}
      />
      {loading && <LoadingState text="Загрузка маршрутов" />}
      {!loading && !state.routes.length ? (
        <EmptyState title="Маршрутов пока нет" text="Создайте маршрут, выберите точки на карте и сохраните линию." action={<Link className="button button--primary" to="/admin/routes/new">Создать маршрут</Link>} />
      ) : (
        <DataTable columns={columns} rows={state.routes} emptyText="Маршрутов пока нет" />
      )}
    </div>
  );
}
