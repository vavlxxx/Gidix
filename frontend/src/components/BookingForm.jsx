import React, { useState } from "react";
import InputMask from "react-input-mask";

import { apiFetch } from "../api";

export default function BookingForm({ routeId, maxParticipants }) {
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

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
          Дата экскурсии
          <input
            type="date"
            name="desired_date"
            min={new Date().toISOString().split("T")[0]}
            value={form.desired_date}
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
