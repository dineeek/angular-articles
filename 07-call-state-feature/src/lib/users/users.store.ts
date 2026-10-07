import { inject } from '@angular/core'
import { tapResponse } from '@ngrx/operators'
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { pipe, switchMap, tap } from 'rxjs'
import { setError, setLoaded, setLoading, withCallState } from '../call-state/with-call-state'
import { User } from './user'
import { UserService } from './user.service'

interface UsersState {
  users: User[]
}

export const UsersStore = signalStore(
  withState<UsersState>({ users: [] }),
  withCallState(),
  withMethods((store, userService = inject(UserService)) => ({
    loadUsers: rxMethod<void>(
      pipe(
        tap(() => patchState(store, setLoading())),
        switchMap(() =>
          userService.getUsers().pipe(
            tapResponse({
              next: (users) => patchState(store, { users }, setLoaded()),
              error: (error: unknown) => patchState(store, setError(error)),
            }),
          ),
        ),
      ),
    ),
  })),
)
