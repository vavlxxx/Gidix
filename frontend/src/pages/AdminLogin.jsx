import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Gidix — вход в панель управления</h1>
        <p>Используйте учетные данные менеджера или администратора.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Пароль
            <input name="password" type="password" value={form.password} onChange={handleChange} required />
          </label>
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </form>
        <Link className="button ghost" to="/">Вернуться на сайт</Link>
      </div>
    </div>
  );
}
