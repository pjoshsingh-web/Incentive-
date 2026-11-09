import type { Plan } from "./workspace";
export type PaymentSchedule = "Monthly" | "Quarterly" | "Annual";
export function paymentTiming(plan: Plan) {
  const schedule = plan.paymentSchedule ?? "Quarterly";
  const count = { Monthly: 12, Quarterly: 4, Annual: 1 }[schedule];
  return {
    schedule,
    count,
    label: `Paid ${schedule.toLowerCase()} · ${count} payouts per year`,
  };
}
