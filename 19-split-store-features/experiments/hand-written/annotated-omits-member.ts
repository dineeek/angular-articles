import { Signal } from '@angular/core'
import { EmptyFeatureResult, SignalStoreFeature, signalStore } from '@ngrx/signals'
import { RxMethod } from '@ngrx/signals/rxjs-interop'
import {
  NamedCallStateSignals,
  NamedCallStateSlice,
} from '../../src/lib/call-state/with-call-state'
import { UsersState, withUsers } from '../../src/lib/directory/features/with-users'
import { User } from '../../src/lib/directory/user'

export interface UsersFeatureResult {
  state: UsersState & NamedCallStateSlice<'users'>
  props: NamedCallStateSignals<'users'> & { _selectedUser: Signal<User | null> }
  methods: { loadUsers: RxMethod<void> }
}

export function withUsersAnnotated(): SignalStoreFeature<EmptyFeatureResult, UsersFeatureResult> {
  return withUsers()
}

export const UsersStore = signalStore(withUsersAnnotated())

export const isSelectUserGoneFromTheType: 'selectUser' extends keyof InstanceType<typeof UsersStore>
  ? false
  : true = true
