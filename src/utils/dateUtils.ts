export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const parseISOYear = (isoString: string): number => {
  if (!isoString) return new Date().getFullYear();
  return new Date(isoString).getFullYear();
};

export const parseISOMonth = (isoString: string): number => {
  if (!isoString) return new Date().getMonth();
  return new Date(isoString).getMonth();
};

export const getMonthYearString = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};

export const parseDateToTimestamp = (dateVal?: string | Date | null): number => {
  if (!dateVal) return 0;
  if (dateVal instanceof Date) return dateVal.getTime();
  const trimmed = String(dateVal).trim();
  if (!trimmed) return 0;

  // Check if standard ISO format YYYY-MM-DD or contains T
  if (trimmed.includes('T') || /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed)) {
    const d = new Date(trimmed);
    const t = d.getTime();
    if (!isNaN(t)) return t;
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      if (year < 100) year += 2000;
      const customDate = new Date(year, month - 1, day, 0, 0, 0);
      if (!isNaN(customDate.getTime())) {
        return customDate.getTime();
      }
    }
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? 0 : fallback.getTime();
};

