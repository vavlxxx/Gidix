import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function LoginPage() {
  const auth = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ email: "admin@example.com", password: "admin123" });
  const [loading, setLoading] = React.useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await auth.login(form);
      notify.success("Вход выполнен.");
      navigate(user?.roles?.length ? "/admin" : "/");
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">Рабочий кабинет</span>
        <h1>Вход в систему</h1>
        <p>Введите данные сотрудника или клиента. Административные роли попадут в рабочий кабинет.</p>
        <form className="stack" onSubmit={submit}>
          <FormField label="Email" required><input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></FormField>
          <FormField label="Пароль" required><input type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></FormField>
          <Button type="submit" tone="primary" disabled={loading}><LogIn size={17} /> {loading ? "Проверяем..." : "Войти"}</Button>
        </form>
        <p className="auth-note">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
      </section>
    </main>
  );
}
