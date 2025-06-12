export function checkPositive(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
