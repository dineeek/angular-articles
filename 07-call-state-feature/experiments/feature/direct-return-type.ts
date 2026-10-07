import { computed, Signal } from '@angular/core'
import {
  EmptyFeatureResult,
  SignalStoreFeature,
  signalStore,
  signalStoreFeature,
  withComputed,
  withState,
} from '@ngrx/signals'

type CallState = 'init' | 'loading' | 'loaded' | { error: string }

function withCallState(): SignalStoreFeature<
  EmptyFeatureResult,
  {
    state: { callState: CallState }
    props: { loading: Signal<boolean> }
    methods: EmptyFeatureResult['methods']
  }
> {
  return signalStoreFeature(
    withState<{ callState: CallState }>({ callState: 'init' }),
    withComputed(({ callState }) => ({ loading: computed(() => callState() === 'loading') })),
  )
}

export const UsersStore = signalStore(withCallState())

export function loadingOf(store: InstanceType<typeof UsersStore>): Signal<boolean> {
  return store.loading
}
