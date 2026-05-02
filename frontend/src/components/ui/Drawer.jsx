import { X } from "lucide-react";

export function Drawer({ title, children, onClose }) {
  if (!children) return null;
  return (
    <aside className="drawer" aria-label={title}>
      <div className="drawer__head">
        <h2>{title}</h2>
        <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose}><X size={18} /></button>
      </div>
      {children}
    </aside>
  );
}
