import { Signal } from '@angular/core'
import { signalStore, withHooks } from '@ngrx/signals'
import { RxMethod } from '@ngrx/signals/rxjs-interop'
import {
  NamedCallStateSignals,
  NamedCallStateSlice,
} from '../../src/lib/call-state/with-call-state'
import { UsersState, withUsers } from '../../src/lib/directory/features/with-users'
import { User } from '../../src/lib/directory/user'

export interface UsersFeatureResult {
  state: UsersState & NamedCallStateSlice<'users'>
  props: NamedCallStateSignals<'users'> & {
    _selectedUser: Signal<User | null>
    selectedUserName: Signal<string>
  }
  methods: { loadUsers: RxMethod<void>; selectUser: (id: number | null) => void }
}

export function readSelectedUserName(
  store: Pick<UsersFeatureResult['props'], 'selectedUserName'>,
): string {
  return store.selectedUserName()
}

export const UsersStore = signalStore(
  withUsers(),
  withHooks({
    onInit(store) {
      readSelectedUserName(store)
    },
  }),
)
