// The workspace uses Canadian dollars throughout; this formats values without FX conversion.
export const currency = "CAD" as const;
const formatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency,
  maximumFractionDigits: 0,
});
export const formatMoney = (amount: number) => formatter.format(amount);
