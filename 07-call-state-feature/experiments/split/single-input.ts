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
  withCallState,
} from '../../src/lib/call-state/with-call-state'
import { Role } from '../../src/lib/users/user'

function withRoles() {
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

export const RolesStore = signalStore(
  withState({ roles: [] as Role[] }),
  withCallState({ collection: 'roles' }),
  withRoles(),
)
