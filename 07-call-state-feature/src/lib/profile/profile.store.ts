import { signalStore, withState } from '@ngrx/signals'
import { withCallState } from '../call-state/with-call-state'

export interface Profile {
  name: string
  age: number
}

export const ProfileStore = signalStore(
  withState({ profile: null as Profile | null, hasProfileError: false }),
  withCallState({ collection: 'profile' }),
)
