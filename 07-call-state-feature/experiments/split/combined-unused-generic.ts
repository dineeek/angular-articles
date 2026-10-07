import {
  patchState,
  signalStore,
  signalStoreFeature,
  type,
  withMethods,
  withState,
} from '@ngrx/signals'
import {
  NamedCallStateSignals,
  NamedCallStateSlice,
  setLoaded,
  setLoading,
  withCallState,
} from '../../src/lib/call-state/with-call-state'
import { Role, User } from '../../src/lib/users/user'

function withUsers<_>() {
  return signalStoreFeature(
    { state: type<{ users: User[] } & NamedCallStateSlice<'users'>>() },
    withMethods((store) => ({
      startUsersLoad(): void {
        patchState(store, setLoading('users'))
      },
    })),
  )
}

function withRoles<_>() {
  return signalStoreFeature(
    {
      state: type<{ roles: Role[] } & NamedCallStateSlice<'roles'>>(),
      props: type<NamedCallStateSignals<'roles'>>(),
    },
    withMethods((store) => ({
      finishRolesLoad(roles: Role[]): void {
        if (store.rolesLoading()) {
          patchState(store, { roles }, setLoaded('roles'))
        }
      },
    })),
  )
}

export const UsersRolesStore = signalStore(
  withState({ users: [] as User[], roles: [] as Role[] }),
  withCallState({ collections: ['users', 'roles'] }),
  withUsers(),
  withRoles(),
)
