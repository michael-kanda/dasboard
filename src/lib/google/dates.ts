

export function parseGscDate(dateString: string): number {
  return new Date(dateString).getTime();
}

export function parseGa4Date(dateString: string): number {
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1;
  const day = parseInt(dateString.substring(6, 8), 10);
  return new Date(year, month, day).getTime();
}
