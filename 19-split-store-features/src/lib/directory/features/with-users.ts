import { computed, inject } from '@angular/core'
import { tapResponse } from '@ngrx/operators'
import {
  patchState,
  signalStoreFeature,
  SignalStoreFeatureType,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { pipe, switchMap, tap } from 'rxjs'
import { setError, setLoaded, setLoading, withCallState } from '../../call-state/with-call-state'
import { User } from '../user'
import { UserService } from '../user.service'

export interface UsersState {
  users: User[]
  selectedUserId: number | null
}

const initialUsersState: UsersState = { users: [], selectedUserId: null }

export function withUsers() {
  return signalStoreFeature(
    withState(initialUsersState),
    withCallState({ collection: 'users' }),
    withComputed(({ users, selectedUserId }) => ({
      _selectedUser: computed(() => users().find((user) => user.id === selectedUserId()) ?? null),
    })),
    withMethods((store, userService = inject(UserService)) => ({
      loadUsers: rxMethod<void>(
        pipe(
          tap(() => patchState(store, setLoading('users'))),
          switchMap(() =>
            userService.getUsers().pipe(
              tapResponse({
                next: (users) => patchState(store, { users }, setLoaded('users')),
                error: (error: unknown) => patchState(store, setError(error, 'users')),
              }),
            ),
          ),
        ),
      ),
      selectUser(id: number | null): void {
        patchState(store, { selectedUserId: id })
      },
    })),
  )
}

export type UsersFeatureResult = SignalStoreFeatureType<typeof withUsers>
