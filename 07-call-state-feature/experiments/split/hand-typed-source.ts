import { Signal } from '@angular/core'
import { patchState, signalStore, withMethods, withState, WritableStateSource } from '@ngrx/signals'
import { User } from '../../src/lib/users/user'

interface UsersState {
  users: User[]
}

export const usersMethods = (
  store: WritableStateSource<UsersState> & { users: Signal<User[]> },
) => ({
  clearUsers(): void {
    patchState(store, { users: [] })
  },
  countUsers(): number {
    return store.users().length
  },
})

export const UsersStore = signalStore(
  withState<UsersState>({ users: [] }),
  withMethods(usersMethods),
)
