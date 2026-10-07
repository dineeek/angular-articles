import { inject } from '@angular/core'
import { tapResponse } from '@ngrx/operators'
import { patchState, signalStoreFeature, withMethods, WritableStateSource } from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { pipe, switchMap, tap } from 'rxjs'
import { NamedCallStateSlice, setError, setLoaded, setLoading } from '../call-state/with-call-state'
import { User } from '../users/user'
import { UserService } from '../users/user.service'

export type UsersSource = WritableStateSource<{ users: User[] } & NamedCallStateSlice<'users'>>

export function withUsers(store: UsersSource) {
  return signalStoreFeature(
    withMethods(() => {
      const userService = inject(UserService)

      return {
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
      }
    }),
  )
}
