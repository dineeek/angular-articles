import { RxMethod } from '@ngrx/signals/rxjs-interop'
import { Mock, vi } from 'vitest'

export function fakeRxMethod(reads: () => unknown = () => undefined): Mock & RxMethod<void> {
  const ref = { destroy: vi.fn() }

  return Object.assign(
    vi.fn(() => {
      reads()

      return ref
    }),
    ref,
  )
}
