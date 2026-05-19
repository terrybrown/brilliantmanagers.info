import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'

const TEST_SECRET = 'test-secret-at-least-32-chars-long!!'

beforeEach(() => {
  vi.resetModules()
  process.env.FEATUREBASE_JWT_SECRET = TEST_SECRET
})

afterEach(() => {
  delete process.env.FEATUREBASE_JWT_SECRET
})

describe('generateFeaturebaseJwt', () => {
  it('returns a JWT containing userId, email, and name', async () => {
    const { generateFeaturebaseJwt } = await import('@/lib/featurebase')
    const token = generateFeaturebaseJwt({
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    })
    const payload = jwt.verify(token, TEST_SECRET, { algorithms: ['HS256'] }) as Record<string, unknown>
    expect(payload.userId).toBe('user-123')
    expect(payload.email).toBe('test@example.com')
    expect(payload.name).toBe('Test User')
  })

  it('signs with HS256 and the JWT secret', async () => {
    const { generateFeaturebaseJwt } = await import('@/lib/featurebase')
    const token = generateFeaturebaseJwt({
      id: 'user-456',
      email: 'other@example.com',
      displayName: 'Other User',
    })
    // verify() throws if the algorithm or secret is wrong
    expect(() => jwt.verify(token, TEST_SECRET, { algorithms: ['HS256'] })).not.toThrow()
  })

  it('throws when FEATUREBASE_JWT_SECRET is not set', async () => {
    delete process.env.FEATUREBASE_JWT_SECRET
    // Re-import to get fresh module (vi.resetModules() in beforeEach ensures a fresh load)
    const { generateFeaturebaseJwt } = await import('@/lib/featurebase')
    expect(() =>
      generateFeaturebaseJwt({ id: 'x', email: 'x@x.com', displayName: 'X' })
    ).toThrow('FEATUREBASE_JWT_SECRET is not set')
  })
})
