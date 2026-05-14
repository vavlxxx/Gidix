import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/State";

export function PlaceholderAdminPage({ title, description }) {
  return (
    <div>
      <PageHeader eyebrow="Раздел АИС" title={title} description={description} />
      <EmptyState title="Раздел в работе" text="Здесь будет доступна детализация рабочего процесса и связанные операции сотрудников." />
    </div>
  );
}
