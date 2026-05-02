export function Card({ className = "", children, as: Component = "section" }) {
  return <Component className={`card ${className}`.trim()}>{children}</Component>;
}
