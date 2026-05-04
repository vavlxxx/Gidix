import React from "react";
import { CheckCircle2, Search, Star, Trash2, XCircle } from "lucide-react";
import { reviewsApi } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusPill } from "../../components/ui/StatusPill";
import { EmptyState, LoadingState } from "../../components/ui/State";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/format";

export function ReviewsPage() {
  const notify = useToast();
  const [reviews, setReviews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");

  const rows = reviews.filter((review) => [review.excursion_title, review.text].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()));

  async function load() {
    setLoading(true);
    try {
      setReviews(await reviewsApi.moderation());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function toggle(review) {
    try {
      await (review.published ? reviewsApi.unpublish(review.id) : reviewsApi.publish(review.id));
      notify.success(review.published ? "Отзыв скрыт." : "Отзыв опубликован.");
      load();
    } catch (err) {
      notify.error(err.message);
    }
  }

  async function remove(review) {
    if (!confirm("Удалить отзыв?")) return;
    try {
      await reviewsApi.delete(review.id);
      notify.success("Отзыв удалён.");
      load();
    } catch (err) {
      notify.error(err.message);
    }
  }

  const columns = [
    { key: "excursion", title: "Экскурсия", render: (row) => row.excursion_title || row.excursion_id },
    { key: "rating", title: "Оценка", render: (row) => <span className="table-stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < row.rating ? "currentColor" : "none"} />)}</span> },
    { key: "text", title: "Текст", render: (row) => row.text || "Без комментария" },
    { key: "created", title: "Дата", render: (row) => formatDate(row.created_at) },
    { key: "status", title: "Статус", render: (row) => <StatusPill status={row.published ? "active" : "checking"} /> },
    { key: "actions", title: "", render: (row) => (
      <div className="actions-row">
        <Button type="button" tone={row.published ? "danger" : "primary"} onClick={() => toggle(row)}>{row.published ? <XCircle size={17} /> : <CheckCircle2 size={17} />}{row.published ? "Скрыть" : "Опубликовать"}</Button>
        <Button type="button" tone="danger" onClick={() => remove(row)}><Trash2 size={17} /> Удалить</Button>
      </div>
    ) }
  ];

  return (
    <div>
      <PageHeader eyebrow="Отзывы" title="Модерация отзывов" description="Публикуйте отзывы участников после проверки." />
      <section className="filters-panel">
        <label className="search-field"><Search size={17} /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Экскурсия или текст отзыва" /></label>
      </section>
      {loading && <LoadingState text="Загрузка отзывов" />}
      {!loading && !rows.length && <EmptyState title="Отзывы не найдены" text="Новых отзывов на модерации пока нет." />}
      {!!rows.length && <DataTable columns={columns} rows={rows} />}
    </div>
  );
}
