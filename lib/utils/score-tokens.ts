export function scoreColor(score: number): string {
  if (score <= 2) return 'var(--color-negative)'
  if (score >= 4) return 'var(--color-positive)'
  return 'var(--color-manager)'
}

export function scoreBg(score: number): string {
  if (score <= 2) return 'var(--color-negative-bg)'
  if (score >= 4) return 'var(--color-positive-bg)'
  return 'var(--color-manager-wash)'
}
