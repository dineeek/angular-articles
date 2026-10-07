import { signalStore, withFeature, withState } from '@ngrx/signals'
import { withCallState } from '../call-state/with-call-state'
import { Role, User } from '../users/user'
import { withRoles } from './with-roles'
import { withUsers } from './with-users'

interface UsersRolesState {
  users: User[]
  roles: Role[]
}

const initialUsersRolesState: UsersRolesState = { users: [], roles: [] }

export const UsersRolesStore = signalStore(
  { providedIn: 'root' },
  withState(initialUsersRolesState),
  withCallState({ collections: ['users', 'roles'] }),
  withFeature((store) => withUsers(store)),
  withFeature((store) => withRoles(store)),
)
