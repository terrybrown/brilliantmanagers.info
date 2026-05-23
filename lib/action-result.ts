export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export function ok<T>(data?: T): ActionResult<T> {
  return data !== undefined ? { ok: true, data } : { ok: true }
}

export function err(error: string): ActionResult<never> {
  return { ok: false, error }
}
