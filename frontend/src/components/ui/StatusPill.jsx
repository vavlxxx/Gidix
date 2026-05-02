import { paymentTitle, statusTitle } from "../../utils/format";

export function StatusPill({ status, type = "booking" }) {
  const text = type === "payment" ? paymentTitle(status) : statusTitle(status);
  return <span className={`status-pill status-pill--${status || "empty"}`}>{text}</span>;
}
