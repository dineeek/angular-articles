import { signalMethod } from '@ngrx/signals'
import type { DirectoryStoreInstance } from '../directory.store'

export function reloadRolesOnUserChange(
  store: Pick<DirectoryStoreInstance, 'selectedUserId' | 'clearRoles' | 'loadRoles'>,
): void {
  const reloadRoles = signalMethod<number | null>(() => {
    store.clearRoles()
    store.loadRoles()
  })

  reloadRoles(store.selectedUserId)
}
