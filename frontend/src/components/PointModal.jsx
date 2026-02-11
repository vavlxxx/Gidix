import React, { useEffect, useState } from "react";

const pointTypeOptions = [
  { value: "museum", label: "Музей" },
  { value: "temple", label: "Храм" },
  { value: "monument", label: "Памятник" },
  { value: "nature", label: "Природная достопримечательность" },
  { value: "park", label: "Зона отдыха" },
  { value: "cafe", label: "Кафе/ресторан" },
  { value: "other", label: "Другое" }
];

export default function PointModal({ isOpen, point, onSave, onClose }) {
  const [form, setForm] = useState(point);

  useEffect(() => {
    setForm(point);
  }, [point]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      visit_minutes: Number(form.visit_minutes)
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>{form.id ? "Редактирование точки" : "Новая точка"}</h3>
          <button className="icon-button" type="button" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Название
            <input name="title" value={form.title} onChange={handleChange} required />
          </label>
          <label>
            Описание
            <textarea name="description" value={form.description} onChange={handleChange} rows="3" />
          </label>
          <label>
            Тип
            <select name="point_type" value={form.point_type} onChange={handleChange}>
              {pointTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Время пребывания (мин.)
            <input
              type="number"
              name="visit_minutes"
              min="5"
              value={form.visit_minutes}
              onChange={handleChange}
              required
            />
          </label>
          <div className="modal-actions">
            <button className="button ghost" type="button" onClick={onClose}>
              Отмена
            </button>
            <button className="button primary" type="submit">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
