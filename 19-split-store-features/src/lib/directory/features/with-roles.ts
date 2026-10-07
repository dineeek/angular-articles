import { inject, Signal } from '@angular/core'
import { tapResponse } from '@ngrx/operators'
import {
  patchState,
  signalStoreFeature,
  SignalStoreFeatureType,
  withMethods,
  withState,
} from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { filter, map, pipe, switchMap, tap } from 'rxjs'
import { setError, setLoaded, setLoading, withCallState } from '../../call-state/with-call-state'
import { Role } from '../user'
import { UserService } from '../user.service'

export interface RolesSource {
  selectedUserId: Signal<number | null>
}

export interface RolesState {
  roles: Role[]
}

const initialRolesState: RolesState = { roles: [] }

export function withRoles(source: RolesSource) {
  return signalStoreFeature(
    withState(initialRolesState),
    withCallState({ collection: 'roles' }),
    withMethods((store, userService = inject(UserService)) => ({
      loadRoles: rxMethod<void>(
        pipe(
          map(() => source.selectedUserId()),
          filter((userId) => userId !== null),
          tap(() => patchState(store, setLoading('roles'))),
          switchMap((userId) =>
            userService.getRoles(userId).pipe(
              tapResponse({
                next: (roles) => patchState(store, { roles }, setLoaded('roles')),
                error: (error: unknown) => patchState(store, setError(error, 'roles')),
              }),
            ),
          ),
        ),
      ),
      clearRoles(): void {
        patchState(store, { roles: [] })
      },
    })),
  )
}

export type RolesFeatureResult = SignalStoreFeatureType<typeof withRoles>
