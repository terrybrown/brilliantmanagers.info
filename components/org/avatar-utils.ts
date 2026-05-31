export const AVATAR_COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#7c3aed',
  '#b45309', '#be185d', '#0e7490', '#15803d',
]

export function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return AVATAR_COLORS[(h >>> 0) % AVATAR_COLORS.length]
}

export function initials(name: string | null, email: string | null): string {
  const src = name ?? email ?? '?'
  return src.slice(0, 2).toUpperCase()
}
