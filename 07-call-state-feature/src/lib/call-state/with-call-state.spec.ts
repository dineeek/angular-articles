import { Signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { patchState, signalStore } from '@ngrx/signals'
import { unprotected } from '@ngrx/signals/testing'
import { CallState, setError, setLoaded, setLoading, withCallState } from './with-call-state'

const SingleStore = signalStore(withCallState())
const ProfileStore = signalStore(withCallState({ collection: 'profile' }))
const UsersStore = signalStore(withCallState({ collections: ['users', 'roles'] }))

function inject<T>(store: new () => T): T {
  TestBed.configureTestingModule({ providers: [store] })

  return TestBed.inject(store)
}

describe('withCallState()', () => {
  it('starts in init with no loading, loaded or error', () => {
    const store = inject(SingleStore)

    expect(store.callState()).toBe('init')
    expect(store.loading()).toBe(false)
    expect(store.loaded()).toBe(false)
    expect(store.error()).toBeNull()
  })

  it('moves through loading, loaded and error with one field per update', () => {
    const store = inject(SingleStore)

    patchState(unprotected(store), setLoading())
    expect([store.loading(), store.loaded(), store.error()]).toEqual([true, false, null])

    patchState(unprotected(store), setLoaded())
    expect([store.loading(), store.loaded(), store.error()]).toEqual([false, true, null])

    patchState(unprotected(store), setError(new Error('Server is down')))
    expect([store.loading(), store.loaded(), store.error()]).toEqual([
      false,
      false,
      'Server is down',
    ])
  })

  it('types the derived members as signals', () => {
    const store = inject(SingleStore)

    expectTypeOf(store.callState()).toEqualTypeOf<CallState>()
    expectTypeOf(store.loading).toEqualTypeOf<Signal<boolean>>()
    expectTypeOf(store.error).toEqualTypeOf<Signal<string | null>>()
  })
})

describe('withCallState({ collection })', () => {
  it('derives profileCallState, profileLoading, profileLoaded and profileError', () => {
    const store = inject(ProfileStore)

    patchState(unprotected(store), setError('Timeout', 'profile'))

    expect(store.profileCallState()).toEqual({ error: 'Timeout' })
    expect(store.profileLoading()).toBe(false)
    expect(store.profileLoaded()).toBe(false)
    expect(store.profileError()).toBe('Timeout')
    expectTypeOf(store.profileLoading).toEqualTypeOf<Signal<boolean>>()
    expectTypeOf(store.profileError).toEqualTypeOf<Signal<string | null>>()
  })
})

describe('withCallState({ collections })', () => {
  it('keeps one call state per collection', () => {
    const store = inject(UsersStore)

    patchState(unprotected(store), setLoading('users'), setLoaded('roles'))

    expect(store.usersLoading()).toBe(true)
    expect(store.rolesLoading()).toBe(false)
    expect(store.rolesLoaded()).toBe(true)
    expectTypeOf(store.rolesError).toEqualTypeOf<Signal<string | null>>()
  })

  it('returns a patch that names the collection field', () => {
    expect(setLoading('users')).toEqual({ usersCallState: 'loading' })
    expect(setLoaded('roles')).toEqual({ rolesCallState: 'loaded' })
    expect(setError('Gone', 'users')).toEqual({ usersCallState: { error: 'Gone' } })
  })
})

describe('setError()', () => {
  it('uses the message of an Error', () => {
    expect(setError(new Error('Server is down'))).toEqual({
      callState: { error: 'Server is down' },
    })
  })

  it('keeps a string as the message', () => {
    expect(setError('Timeout')).toEqual({ callState: { error: 'Timeout' } })
  })

  it('uses the message of an HttpErrorResponse', () => {
    const response = new HttpErrorResponse({
      status: 500,
      statusText: 'Server Error',
      url: '/api/users',
    })

    expect(setError(response)).toEqual({
      callState: { error: 'Http failure response for /api/users: 500 Server Error' },
    })
  })

  it('cannot rely on instanceof Error for an HttpErrorResponse', () => {
    const response = new HttpErrorResponse({ status: 500, url: '/api/users' })

    expect(response instanceof Error).toBe(false)
    expect(String(response)).toBe('[object Object]')
  })

  it('turns any other value into a string', () => {
    expect(setError(404)).toEqual({ callState: { error: '404' } })
  })
})
