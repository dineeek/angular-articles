import { signalStore, withState } from '@ngrx/signals'
import { withCallState } from '../../src/lib/call-state/with-call-state'

export interface Profile {
  name: string
  age: number
}

export const ProfileStore = signalStore(
  withState({ profile: null as Profile | null, profileError: false }),
  withCallState({ collection: 'profile' }),
)
