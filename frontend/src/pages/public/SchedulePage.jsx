import React from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/client";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/State";
import { PageHeader } from "../../components/ui/PageHeader";
import { useExcursions } from "../../hooks/useExcursions";
import { formatDate, formatTime } from "../../utils/format";

export function SchedulePage() {
  const { excursions, loading, error } = useExcursions();
  const [sessions, setSessions] = React.useState([]);
  const [sessionError, setSessionError] = React.useState("");

  React.useEffect(() => {
    if (!excursions.length) return;
    Promise.all(excursions.map((item) => adminApi.excursionSessions(item.id).catch(() => [])))
      .then((groups) => setSessions(groups.flat().map((session) => ({
        ...session,
        excursion: excursions.find((item) => item.id === session.excursion_id)
      }))))
      .catch((err) => setSessionError(err.message));
  }, [excursions]);

  const sorted = [...sessions].sort((a, b) => `${a.session_date} ${a.start_time}`.localeCompare(`${b.session_date} ${b.start_time}`));

  return (
    <div>
      <PageHeader eyebrow="Расписание" title="Доступные даты и время экскурсий" description="Расписание связано с вместимостью и заявками. После выбора даты клиент переходит к карточке экскурсии и завершает запись." />
      {loading && <LoadingState text="Загрузка расписания" />}
      {(error || sessionError) && <ErrorState text={error || sessionError} />}
      {!loading && !sorted.length && <EmptyState title="Опубликованных дат пока нет" text="Менеджер добавит сеансы в рабочем кабинете." />}
      <section className="schedule-list">
        {sorted.map((session) => (
          <Link className="schedule-row" key={session.id} to={`/excursions/${session.excursion_id}`}>
            <strong>{formatDate(session.session_date)}</strong>
            <span>{formatTime(session.start_time)} · {session.available_places ?? session.capacity} мест</span>
            <p>{session.excursion?.title || `Экскурсия ${session.excursion_id}`}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
