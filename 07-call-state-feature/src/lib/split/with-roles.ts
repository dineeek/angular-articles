import { inject } from '@angular/core'
import { tapResponse } from '@ngrx/operators'
import { patchState, signalStoreFeature, withMethods, WritableStateSource } from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { exhaustMap, filter, pipe, tap } from 'rxjs'
import {
  NamedCallStateSignals,
  NamedCallStateSlice,
  setError,
  setLoaded,
  setLoading,
} from '../call-state/with-call-state'
import { Role } from '../users/user'
import { UserService } from '../users/user.service'

export type RolesSource = WritableStateSource<{ roles: Role[] } & NamedCallStateSlice<'roles'>> &
  NamedCallStateSignals<'roles'>

export function withRoles(store: RolesSource) {
  return signalStoreFeature(
    withMethods(() => {
      const userService = inject(UserService)

      return {
        loadRoles: rxMethod<void>(
          pipe(
            filter(() => !store.rolesLoading()),
            tap(() => patchState(store, setLoading('roles'))),
            exhaustMap(() =>
              userService.getRoles().pipe(
                tapResponse({
                  next: (roles) => patchState(store, { roles }, setLoaded('roles')),
                  error: (error: unknown) => patchState(store, setError(error, 'roles')),
                }),
              ),
            ),
          ),
        ),
      }
    }),
  )
}
