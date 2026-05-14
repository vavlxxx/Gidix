import { Edit3, Eye, Plus } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusPill } from "../../components/ui/StatusPill";
import { LoadingState } from "../../components/ui/State";
import { useAdminData } from "../../hooks/useAdminData";
import { money, minutes } from "../../utils/format";

export function ExcursionsPage() {
  const { state, loading } = useAdminData();
  const columns = [
    { key: "title", title: "Экскурсия" },
    { key: "route", title: "Маршрут", render: (row) => row.route?.title || row.route_id || "—" },
    { key: "price", title: "Базовая стоимость", render: (row) => money(row.base_price) },
    { key: "duration", title: "Длительность", render: (row) => minutes(row.duration_min || row.route?.estimated_duration_min) },
    { key: "active", title: "Статус", render: (row) => <StatusPill status={row.active ? "active" : "cancelled"} /> },
    { key: "actions", title: "Действия", render: (row) => <div className="actions-row"><Button as="link" to={`/admin/excursions/${row.id}/edit`}><Edit3 size={15} /> Редактировать</Button><Button as="link" to={`/excursions/${row.id}`} tone="neutral"><Eye size={15} /> Просмотр</Button></div> }
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Менеджер"
        title="Экскурсии"
        description="Список программ с базовой стоимостью. Тарифы не используются: итоговая сумма считается в заявке."
        actions={<Button as="link" to="/admin/excursions/new" tone="primary"><Plus size={17} /> Новая экскурсия</Button>}
      />
      {loading && <LoadingState text="Загрузка экскурсий" />}
      <DataTable columns={columns} rows={state.excursions} emptyText="Экскурсий пока нет" />
    </div>
  );
}
