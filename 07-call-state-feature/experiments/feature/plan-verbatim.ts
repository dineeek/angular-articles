import { computed } from '@angular/core'
import { signalStore, signalStoreFeature, withComputed, withState } from '@ngrx/signals'

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
export const setError = (error: unknown) => ({
  callState: { error: error instanceof Error ? error.message : String(error) },
})

export const UsersStore = signalStore(withState({ users: [] as string[] }), withCallState())
