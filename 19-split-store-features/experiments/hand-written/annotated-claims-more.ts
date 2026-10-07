import { Signal } from '@angular/core'
import { EmptyFeatureResult, SignalStoreFeature } from '@ngrx/signals'
import { RxMethod } from '@ngrx/signals/rxjs-interop'
import {
  NamedCallStateSignals,
  NamedCallStateSlice,
} from '../../src/lib/call-state/with-call-state'
import {
  ProfileSource,
  ProfileState,
  withProfile,
} from '../../src/lib/directory/features/with-profile'

export interface ProfileFeatureResult {
  state: ProfileState & NamedCallStateSlice<'profile'>
  props: NamedCallStateSignals<'profile'> & { isProfileStale: Signal<boolean> }
  methods: { loadProfile: RxMethod<void> }
}

export function withProfileAnnotated(
  source: ProfileSource,
): SignalStoreFeature<EmptyFeatureResult, ProfileFeatureResult> {
  return withProfile(source)
}
