import { SignalStoreFeatureType } from '@ngrx/signals'
import { withRoles } from '../../src/lib/directory/features/with-roles'

type RolesFeatureResult = SignalStoreFeatureType<typeof withRoles>

type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

export const hasRolesState: IsEqual<keyof RolesFeatureResult['state'], 'roles' | 'rolesCallState'> =
  true

export const hasRolesProps: IsEqual<
  keyof RolesFeatureResult['props'],
  'rolesLoading' | 'rolesLoaded' | 'rolesError'
> = true

export const hasRolesMethods: IsEqual<
  keyof RolesFeatureResult['methods'],
  'loadRoles' | 'clearRoles'
> = true
