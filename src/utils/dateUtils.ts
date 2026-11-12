export const getMaxSelectableDob = (): Date => {
  const today = new Date();
  const cutoff = new Date(
    today.getFullYear() - 16,
    today.getMonth(),
    today.getDate()
  );
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
};

export const formatDateToDisplay = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatDateToIso = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

export const parseDobToDate = (value: unknown): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'string' && value.trim()) {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const date = new Date(
        Number(isoMatch[1]),
        Number(isoMatch[2]) - 1,
        Number(isoMatch[3])
      );
      if (
        date.getFullYear() === Number(isoMatch[1]) &&
        date.getMonth() === Number(isoMatch[2]) - 1 &&
        date.getDate() === Number(isoMatch[3])
      ) {
        return date;
      }
    }

    const dmyMatch = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[2]);
      const year = Number(dmyMatch[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }
    }
  }

  return getMaxSelectableDob();
};