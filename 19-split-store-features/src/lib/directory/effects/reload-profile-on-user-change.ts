import { computed } from '@angular/core'
import { signalMethod } from '@ngrx/signals'
import { ProfileFeatureResult } from '../features/with-profile'
import { UsersFeatureResult } from '../features/with-users'

export type ReloadProfileSource = Pick<UsersFeatureResult['props'], '_selectedUser'> &
  Pick<ProfileFeatureResult['methods'], 'clearProfile' | 'loadProfile'>

export function reloadProfileOnUserChange(store: ReloadProfileSource): void {
  const reloadProfile = signalMethod<number | null>(() => {
    store.clearProfile()
    store.loadProfile()
  })

  reloadProfile(computed(() => store._selectedUser()?.id ?? null))
}
