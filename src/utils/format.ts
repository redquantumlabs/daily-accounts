export const formatAmount = (amount: number): string => {
  if (isNaN(amount)) return '0.00';
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const parts = Number(rounded).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

export const roundAmount = (amount: number): number => {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};
