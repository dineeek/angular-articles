import { signalStore, withState } from '@ngrx/signals'
import { withCallState } from '../../src/lib/call-state/with-call-state'
import { Profile } from './profile.store'

export const ProfileStore = signalStore(
  withState({ profile: null as Profile | null, profileError: null as string | null }),
  withCallState({ collection: 'profile' }),
)
