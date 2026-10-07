import { EmptyFeatureResult, SignalStoreFeature, signalStore, withFeature } from '@ngrx/signals'
import { RxMethod } from '@ngrx/signals/rxjs-interop'
import {
  NamedCallStateSignals,
  NamedCallStateSlice,
} from '../../src/lib/call-state/with-call-state'
import { RolesSource, RolesState, withRoles } from '../../src/lib/directory/features/with-roles'
import { withUsers } from '../../src/lib/directory/features/with-users'

export interface RolesFeatureResult {
  state: RolesState & NamedCallStateSlice<'roles'>
  props: NamedCallStateSignals<'roles'>
  methods: {
    loadRoles: RxMethod<void>
    clearRoles: () => void
  }
}

export function withRolesAnnotated(
  source: RolesSource,
): SignalStoreFeature<EmptyFeatureResult, RolesFeatureResult> {
  return withRoles(source)
}

export const RolesStore = signalStore(
  withUsers(),
  withFeature((store) => withRolesAnnotated(store)),
)
