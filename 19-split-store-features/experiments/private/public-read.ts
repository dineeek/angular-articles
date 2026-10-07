import { DirectoryStoreInstance } from '../../src/lib/directory/directory.store'

export function selectedUserName(store: DirectoryStoreInstance): string | undefined {
  return store._selectedUser()?.name
}
