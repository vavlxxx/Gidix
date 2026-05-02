import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function LoadingState({ text = "Загрузка данных" }) {
  return <div className="state state--loading"><Loader2 className="spin" size={18} aria-hidden /> {text}</div>;
}

export function ErrorState({ text = "Не удалось загрузить данные." }) {
  return <div className="state state--error"><AlertCircle size={18} aria-hidden /> {text}</div>;
}

export function EmptyState({ title = "Данных пока нет", text, action }) {
  return (
    <div className="state state--empty">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function SuccessState({ title, text, action }) {
  return (
    <div className="state state--success">
      <CheckCircle2 size={26} aria-hidden />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
