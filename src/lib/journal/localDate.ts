export function localDateKey(value: Date | string | number = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localMonthBounds(year: number, monthIndex: number): { start: string; end: string } {
  return {
    start: localDateKey(new Date(year, monthIndex, 1, 12, 0, 0, 0)),
    end: localDateKey(new Date(year, monthIndex + 1, 0, 12, 0, 0, 0)),
  };
}
