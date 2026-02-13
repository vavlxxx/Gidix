import React, { useEffect, useState } from "react";

import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "manager"
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = () => {
    apiFetch("/api/users/")
      .then((data) => setUsers(data))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadUsers();
    }
  }, [user]);

  if (user?.role !== "admin") {
    return (
      <div className="admin-page">
        <h1>Пользователи</h1>
        <p>Доступно только администраторам.</p>
      </div>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiFetch("/api/users/", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
          is_active: true
        })
      });
      setMessage("Пользователь создан");
      setForm({ full_name: "", email: "", password: "", role: "manager" });
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async (userId, payload) => {
    setError("");
    try {
      await apiFetch(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = (userId) => {
    const nextPassword = window.prompt("Введите новый временный пароль");
    if (!nextPassword) {
      return;
    }
    handleUpdate(userId, { password: nextPassword });
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Пользователи</h1>
          <p>Создавайте учетные записи сотрудников и управляйте ролями.</p>
        </div>
        <div className="admin-header-actions" aria-hidden="true" />
      </div>

      <div className="admin-card">
        <h3>Добавить сотрудника</h3>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            ФИО
            <input name="full_name" value={form.full_name} onChange={handleChange} required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Временный пароль
            <input name="password" type="text" value={form.password} onChange={handleChange} required />
          </label>
          <label>
            Роль
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="manager">Менеджер</option>
              <option value="admin">Администратор</option>
            </select>
          </label>
          <button className="button primary" type="submit">Создать</button>
        </form>
        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.full_name}</td>
                <td>{item.email}</td>
                <td>
                  <select
                    value={item.role}
                    onChange={(event) => handleUpdate(item.id, { role: event.target.value })}
                  >
                    <option value="manager">Менеджер</option>
                    <option value="admin">Администратор</option>
                  </select>
                </td>
                <td>
                  <select
                    value={item.is_active ? "active" : "inactive"}
                    onChange={(event) =>
                      handleUpdate(item.id, { is_active: event.target.value === "active" })
                    }
                  >
                    <option value="active">Активен</option>
                    <option value="inactive">Неактивен</option>
                  </select>
                </td>
                <td>
                  <button className="button ghost" type="button" onClick={() => handleResetPassword(item.id)}>
                    Сбросить пароль
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
