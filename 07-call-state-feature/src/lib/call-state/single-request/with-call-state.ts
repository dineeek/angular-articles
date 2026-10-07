import { computed } from '@angular/core'
import { signalStoreFeature, withComputed, withState } from '@ngrx/signals'

export type CallState = 'init' | 'loading' | 'loaded' | { error: string }

export function withCallState() {
  return signalStoreFeature(
    withState<{ callState: CallState }>({ callState: 'init' }),
    withComputed(({ callState }) => ({
      loading: computed(() => callState() === 'loading'),
      loaded: computed(() => callState() === 'loaded'),
      error: computed(() => {
        const state = callState()

        return typeof state === 'object' ? state.error : null
      }),
    })),
  )
}

export const setLoading = () => ({ callState: 'loading' as const })
export const setLoaded = () => ({ callState: 'loaded' as const })
export const setError = (error: unknown) => ({ callState: { error: toErrorMessage(error) } })

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message)
  }

  return String(error)
}
