import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { cleanPayload } from "../../utils/format";

export function RegisterPage() {
  const auth = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ first_name: "", last_name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = React.useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await auth.register(cleanPayload(form));
      notify.success("Аккаунт создан.");
      navigate("/");
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">Регистрация</span>
        <h1>Клиентский аккаунт</h1>
        <p>Аккаунт пригодится для повторных заявок и просмотра статуса записи.</p>
        <form className="stack" onSubmit={submit}>
          <FormField label="Имя"><input autoComplete="given-name" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></FormField>
          <FormField label="Фамилия"><input autoComplete="family-name" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></FormField>
          <FormField label="Email" required><input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></FormField>
          <FormField label="Телефон"><input autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></FormField>
          <FormField label="Пароль" required hint="Минимум 8 символов"><input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></FormField>
          <Button type="submit" tone="primary" disabled={loading}><UserPlus size={17} /> {loading ? "Создаём..." : "Зарегистрироваться"}</Button>
        </form>
        <p className="auth-note">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
      </section>
    </main>
  );
}
