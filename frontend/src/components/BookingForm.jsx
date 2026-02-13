import React, { useEffect, useMemo, useState } from "react";
import InputMask from "react-input-mask";

import { apiFetch } from "../api";

export default function BookingForm({ routeId, maxParticipants }) {
  const [availableDates, setAvailableDates] = useState([]);
  const [dateStatus, setDateStatus] = useState("idle");
  const [dateError, setDateError] = useState("");
  const [form, setForm] = useState({
    client_name: "",
    phone: "",
    email: "",
    desired_date: "",
    participants: 1,
    comment: "",
    consent: false
  });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!routeId) return;
    setDateStatus("loading");
    setDateError("");
    apiFetch(`/api/routes/${routeId}/dates`)
      .then((data) => setAvailableDates(data))
      .catch((err) => setDateError(err.message))
      .finally(() => setDateStatus("idle"));
  }, [routeId]);

  useEffect(() => {
    if (!form.desired_date) return;
    const exists = availableDates.some((item) => item.date === form.desired_date);
    if (!exists) {
      setForm((prev) => ({ ...prev, desired_date: "" }));
    }
  }, [availableDates, form.desired_date]);

  const groupedDates = useMemo(() => {
    const groups = {};
    availableDates.forEach((item) => {
      const dateValue = new Date(`${item.date}T00:00:00`);
      const key = dateValue.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    return Object.entries(groups);
  }, [availableDates]);

  const formatSlotDate = (value) => {
    const dateValue = new Date(`${value}T00:00:00`);
    return {
      day: dateValue.toLocaleDateString("ru-RU", { day: "2-digit" }),
      weekday: dateValue.toLocaleDateString("ru-RU", { weekday: "short" }),
      month: dateValue.toLocaleDateString("ru-RU", { month: "short" })
    };
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.desired_date) {
      setStatus("error");
      setMessage("Выберите дату из доступных.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const payload = {
        ...form,
        route_id: routeId,
        participants: Number(form.participants)
      };
      const response = await apiFetch("/api/bookings/", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setStatus("success");
      setMessage(`Заявка отправлена. Номер: ${response.code}`);
      setForm((prev) => ({
        ...prev,
        client_name: "",
        phone: "",
        email: "",
        desired_date: "",
        participants: 1,
        comment: "",
        consent: false
      }));
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          ФИО
          <input
            name="client_name"
            value={form.client_name}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Телефон
          <InputMask
            mask="+7 (999) 999-99-99"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
          >
            {(inputProps) => <input {...inputProps} />}
          </InputMask>
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Количество участников
          <input
            type="number"
            name="participants"
            min="1"
            max={maxParticipants}
            value={form.participants}
            onChange={handleChange}
            required
          />
        </label>
        <div className="date-picker full">
          <div className="date-picker-header">
            <div>
              <span>Доступные даты</span>
              <small>Выберите дату из списка — бронь подтверждается после обработки заявки.</small>
            </div>
            {form.desired_date && (
              <div className="date-picked">
                Вы выбрали {new Date(`${form.desired_date}T00:00:00`).toLocaleDateString("ru-RU")}
              </div>
            )}
          </div>
          {dateStatus === "loading" && <p>Загрузка дат...</p>}
          {dateError && <p className="error-text">{dateError}</p>}
          {dateStatus !== "loading" && !dateError && availableDates.length === 0 && (
            <p>Пока нет доступных дат. Попробуйте позже.</p>
          )}
          <div className="date-table">
            {groupedDates.map(([month, items]) => (
              <div key={month} className="date-table-group">
                <div className="date-table-month">{month}</div>
                <div className="date-table-grid">
                  {items.map((item) => {
                    const parts = formatSlotDate(item.date);
                    const isActive = form.desired_date === item.date;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`date-slot${isActive ? " active" : ""}`}
                        aria-pressed={isActive}
                        onClick={() => setForm((prev) => ({ ...prev, desired_date: item.date }))}
                      >
                        <span className="date-slot-day">{parts.day}</span>
                        <span className="date-slot-meta">{parts.month} · {parts.weekday}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <label className="full">
          Комментарий
          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            rows="3"
          />
        </label>
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          name="consent"
          checked={form.consent}
          onChange={handleChange}
          required
        />
        <span>
          Согласен с политикой обработки персональных данных
        </span>
      </label>
      <button className="button primary" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Отправка..." : "Отправить заявку"}
      </button>
      {message && (
        <p className={status === "error" ? "error-text" : "success-text"}>{message}</p>
      )}
    </form>
  );
}
