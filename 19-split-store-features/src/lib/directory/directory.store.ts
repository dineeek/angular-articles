import { signalStore, withFeature, withHooks } from '@ngrx/signals'
import { reloadProfileOnUserChange } from './effects/reload-profile-on-user-change'
import { reloadRolesOnUserChange } from './effects/reload-roles-on-user-change'
import { withProfile } from './features/with-profile'
import { withRoles } from './features/with-roles'
import { withUsers } from './features/with-users'

export const DirectoryStore = signalStore(
  { providedIn: 'root' },
  withUsers(),
  withFeature((store) => withRoles(store)),
  withFeature((store) => withProfile(store)),
  withHooks({
    onInit(store) {
      reloadRolesOnUserChange(store)
      reloadProfileOnUserChange(store)
    },
  }),
)

export type DirectoryStoreInstance = InstanceType<typeof DirectoryStore>
