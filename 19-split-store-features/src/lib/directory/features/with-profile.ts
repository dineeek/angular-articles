import { inject } from '@angular/core'
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
import { Profile } from '../user'
import { UserService } from '../user.service'
import { UsersFeatureResult } from './with-users'

export type ProfileSource = Pick<UsersFeatureResult['props'], '_selectedUser'>

export interface ProfileState {
  profile: Profile | null
}

const initialProfileState: ProfileState = { profile: null }

export function withProfile(source: ProfileSource) {
  return signalStoreFeature(
    withState(initialProfileState),
    withCallState({ collection: 'profile' }),
    withMethods((store, userService = inject(UserService)) => ({
      loadProfile: rxMethod<void>(
        pipe(
          map(() => source._selectedUser()),
          filter((user) => user !== null),
          tap(() => patchState(store, setLoading('profile'))),
          switchMap((user) =>
            userService.getProfile(user.id).pipe(
              tapResponse({
                next: (profile) => patchState(store, { profile }, setLoaded('profile')),
                error: (error: unknown) => patchState(store, setError(error, 'profile')),
              }),
            ),
          ),
        ),
      ),
      clearProfile(): void {
        patchState(store, { profile: null })
      },
    })),
  )
}

export type ProfileFeatureResult = SignalStoreFeatureType<typeof withProfile>
