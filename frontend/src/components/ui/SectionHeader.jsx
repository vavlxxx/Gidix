export function SectionHeader({ title, description, actions }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="section-header__actions">{actions}</div>}
    </div>
  );
}
