import { computed, Signal } from '@angular/core'
import {
  EmptyFeatureResult,
  SignalStoreFeature,
  signalStoreFeature,
  withComputed,
  withState,
} from '@ngrx/signals'

export type CallState = 'init' | 'loading' | 'loaded' | { error: string }

export interface CallStateSlice {
  callState: CallState
}

export interface CallStateSignals {
  loading: Signal<boolean>
  loaded: Signal<boolean>
  error: Signal<string | null>
}

export type NamedCallStateSlice<Collection extends string> = {
  [K in Collection as `${K}CallState`]: CallState
}

export type NamedCallStateSignals<Collection extends string> = {
  [K in Collection as `${K}Loading` | `${K}Loaded`]: Signal<boolean>
} & {
  [K in Collection as `${K}Error`]: Signal<string | null>
}

interface CallStateKeys {
  callState: string
  loading: string
  loaded: string
  error: string
}

function callStateKeys(collection?: string): CallStateKeys {
  if (!collection) {
    return { callState: 'callState', loading: 'loading', loaded: 'loaded', error: 'error' }
  }

  return {
    callState: `${collection}CallState`,
    loading: `${collection}Loading`,
    loaded: `${collection}Loaded`,
    error: `${collection}Error`,
  }
}

type CallStateConfig = { collection: string } | { collections: string[] }

function collectionsOf(config?: CallStateConfig): (string | undefined)[] {
  if (!config) {
    return [undefined]
  }

  return 'collection' in config ? [config.collection] : config.collections
}

function errorOf(callState: CallState): string | null {
  return typeof callState === 'object' ? callState.error : null
}

export function withCallState(): SignalStoreFeature<
  EmptyFeatureResult,
  { state: CallStateSlice; props: CallStateSignals; methods: EmptyFeatureResult['methods'] }
>
export function withCallState<Collection extends string>(config: {
  collection: Collection
}): SignalStoreFeature<
  EmptyFeatureResult,
  {
    state: NamedCallStateSlice<Collection>
    props: NamedCallStateSignals<Collection>
    methods: EmptyFeatureResult['methods']
  }
>
export function withCallState<Collection extends string>(config: {
  collections: Collection[]
}): SignalStoreFeature<
  EmptyFeatureResult,
  {
    state: NamedCallStateSlice<Collection>
    props: NamedCallStateSignals<Collection>
    methods: EmptyFeatureResult['methods']
  }
>

export function withCallState(config?: CallStateConfig): SignalStoreFeature {
  const keys = collectionsOf(config).map(callStateKeys)

  return signalStoreFeature(
    withState(() =>
      Object.fromEntries(keys.map(({ callState }): [string, CallState] => [callState, 'init'])),
    ),
    withComputed((store: Record<string, Signal<unknown>>) =>
      Object.fromEntries(
        keys.flatMap(({ callState, loading, loaded, error }) => {
          const state = store[callState] as Signal<CallState>

          return [
            [loading, computed(() => state() === 'loading')],
            [loaded, computed(() => state() === 'loaded')],
            [error, computed(() => errorOf(state()))],
          ]
        }),
      ),
    ),
  )
}

type CallStatePatch = CallStateSlice | NamedCallStateSlice<string>

function patchFor(callState: CallState, collection?: string): CallStatePatch {
  return { [callStateKeys(collection).callState]: callState }
}

export function setLoading(): CallStateSlice
export function setLoading<Collection extends string>(
  collection: Collection,
): NamedCallStateSlice<Collection>

export function setLoading(collection?: string): CallStatePatch {
  return patchFor('loading', collection)
}

export function setLoaded(): CallStateSlice
export function setLoaded<Collection extends string>(
  collection: Collection,
): NamedCallStateSlice<Collection>

export function setLoaded(collection?: string): CallStatePatch {
  return patchFor('loaded', collection)
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message)
  }

  return String(error)
}

export function setError(error: unknown): CallStateSlice
export function setError<Collection extends string>(
  error: unknown,
  collection: Collection,
): NamedCallStateSlice<Collection>

export function setError(error: unknown, collection?: string): CallStatePatch {
  return patchFor({ error: toErrorMessage(error) }, collection)
}
