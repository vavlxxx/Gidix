export function FormField({ label, hint, required = false, children }) {
  return (
    <label className="form-field">
      <span>{label}{required && <b aria-label="обязательное поле"> *</b>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
