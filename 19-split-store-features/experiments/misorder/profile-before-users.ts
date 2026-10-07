import { signalStore, withFeature } from '@ngrx/signals'
import { withProfile } from '../../src/lib/directory/features/with-profile'
import { withRoles } from '../../src/lib/directory/features/with-roles'
import { withUsers } from '../../src/lib/directory/features/with-users'

export const MisorderedStore = signalStore(
  withFeature((store) => withProfile(store)),
  withUsers(),
  withFeature((store) => withRoles(store)),
)
