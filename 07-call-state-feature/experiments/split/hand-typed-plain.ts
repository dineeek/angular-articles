import { Signal } from '@angular/core'
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals'
import { User } from '../../src/lib/users/user'

export const usersMethods = (store: { users: Signal<User[]> }) => ({
  clearUsers(): void {
    patchState(store, { users: [] })
  },
})

export const UsersStore = signalStore(withState({ users: [] as User[] }), withMethods(usersMethods))
