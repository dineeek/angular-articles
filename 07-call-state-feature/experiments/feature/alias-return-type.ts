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

type FeatureOf<State extends object, Props extends object> = SignalStoreFeature<
  EmptyFeatureResult,
  { state: State; props: Props; methods: EmptyFeatureResult['methods'] }
>

function withCallState(): FeatureOf<{ callState: CallState }, { loading: Signal<boolean> }> {
  return signalStoreFeature(
    withState<{ callState: CallState }>({ callState: 'init' }),
    withComputed(({ callState }) => ({ loading: computed(() => callState() === 'loading') })),
  )
}

export const UsersStore = signalStore(withCallState())

export function loadingOf(store: InstanceType<typeof UsersStore>): Signal<boolean> {
  return store.loading
}
