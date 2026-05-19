import jwt from 'jsonwebtoken'

export function generateFeaturebaseJwt(user: {
  id: string
  email: string
  displayName: string
}): string | null {
  const secret = process.env.FEATUREBASE_JWT_SECRET
  if (!secret) return null

  return jwt.sign(
    { userId: user.id, email: user.email, name: user.displayName },
    secret,
    { algorithm: 'HS256' }
  )
}
