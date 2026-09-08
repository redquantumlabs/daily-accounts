export const formatAmount = (amount: number): string => {
  if (isNaN(amount) || amount === null) return '0.00';
  const rounded = Math.sign(amount) * Math.round((Math.abs(amount) + 1e-9) * 100) / 100;
  const parts = Number(rounded).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

export const roundAmount = (amount: number): number => {
  if (isNaN(amount) || amount === null) return 0;
  return Math.sign(amount) * Math.round((Math.abs(amount) + 1e-9) * 100) / 100;
};
