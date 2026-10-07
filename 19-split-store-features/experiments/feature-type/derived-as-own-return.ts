import { EmptyFeatureResult, SignalStoreFeature, SignalStoreFeatureType } from '@ngrx/signals'
import { RolesSource, withRoles } from '../../src/lib/directory/features/with-roles'

export function withRolesSelfTyped(
  source: RolesSource,
): SignalStoreFeature<EmptyFeatureResult, SignalStoreFeatureType<typeof withRolesSelfTyped>> {
  return withRoles(source)
}
