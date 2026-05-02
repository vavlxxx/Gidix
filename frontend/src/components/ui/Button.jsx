import { Link } from "react-router-dom";

export function Button({ as = "button", tone = "neutral", className = "", children, ...props }) {
  const Component = as === "link" ? Link : as;
  return <Component className={`button button--${tone} ${className}`.trim()} {...props}>{children}</Component>;
}
