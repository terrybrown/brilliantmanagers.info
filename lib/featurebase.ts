import jwt from 'jsonwebtoken'

export function generateFeaturebaseJwt(user: {
  id: string
  email: string
  displayName: string
}): string {
  const secret = process.env.FEATUREBASE_JWT_SECRET
  if (!secret) throw new Error('FEATUREBASE_JWT_SECRET is not set')

  return jwt.sign(
    { userId: user.id, email: user.email, name: user.displayName },
    secret,
    { algorithm: 'HS256' }
  )
}
