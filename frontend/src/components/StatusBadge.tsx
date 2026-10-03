import type { Order } from "../lib/api";

const labels: Record<Order["status"], string> = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت شده",
  READY_FOR_PICKUP: "آماده دریافت",
  COMPLETED: "تکمیل شده",
  CANCELLED: "لغو شده",
  EXPIRED: "منقضی شده",
};

export function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className={"status-badge status-" + status.toLowerCase()}>
      {labels[status]}
    </span>
  );
}
