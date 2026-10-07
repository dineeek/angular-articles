import { signalStore, signalStoreFeature, type, withState } from '@ngrx/signals'

function withZ<_>() {
  return signalStoreFeature({ state: type<{ x: number }>() }, withState({ z: 10 }))
}

function withW<_>() {
  return signalStoreFeature({ state: type<{ y: number }>() }, withState({ w: 100 }))
}

export const Store = signalStore(withState({ x: 10, y: 100 }), withZ(), withW())
