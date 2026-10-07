import { patchState } from '@ngrx/signals'
import { DirectoryStoreInstance } from '../../src/lib/directory/directory.store'

export function clearProfile(store: DirectoryStoreInstance): void {
  patchState(store, { profile: null })
}
