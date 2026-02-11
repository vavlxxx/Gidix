import React, { useEffect, useState } from "react";

const statusLabels = {
  new: "Новая",
  in_progress: "В обработке",
  confirmed: "Подтверждена",
  canceled: "Отменена"
};

export default function BookingModal({ booking, onClose, onSave }) {
  const [status, setStatus] = useState(booking.status);
  const [notes, setNotes] = useState(booking.internal_notes || "");

  useEffect(() => {
    setStatus(booking.status);
    setNotes(booking.internal_notes || "");
  }, [booking]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({ status, internal_notes: notes });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal large">
        <div className="modal-header">
          <h3>Заявка {booking.code}</h3>
          <button className="icon-button" type="button" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div>
              <h4>Контакты</h4>
              <p>{booking.client_name}</p>
              <p>{booking.phone}</p>
              <p>{booking.email}</p>
            </div>
            <div>
              <h4>Экскурсия</h4>
              <p>{booking.route_title}</p>
              <p>Дата: {new Date(booking.desired_date).toLocaleDateString("ru-RU")}</p>
              <p>Участники: {booking.participants}</p>
            </div>
            <div>
              <h4>Статус</h4>
              <span className={`status-tag ${status}`}>{statusLabels[status]}</span>
            </div>
          </div>
          {booking.comment && (
            <div className="detail-block">
              <h4>Комментарий клиента</h4>
              <p>{booking.comment}</p>
            </div>
          )}
          <form className="detail-form" onSubmit={handleSubmit}>
            <label>
              Статус
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Внутренние заметки
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="3" />
            </label>
            <div className="modal-actions">
              <button className="button ghost" type="button" onClick={onClose}>
                Закрыть
              </button>
              <button className="button primary" type="submit">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
