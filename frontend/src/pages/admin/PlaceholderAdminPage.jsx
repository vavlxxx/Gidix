import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/State";

export function PlaceholderAdminPage({ title, description }) {
  return (
    <div>
      <PageHeader eyebrow="Раздел АИС" title={title} description={description} />
      <EmptyState title="Раздел подготовлен для расширения" text="В демонстрационной версии здесь показана структура рабочего кабинета. Подключение детальной логики можно выполнить следующим этапом." />
    </div>
  );
}
