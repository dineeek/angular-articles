import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { patchState, signalStore, withState } from '@ngrx/signals'
import { unprotected } from '@ngrx/signals/testing'
import { setError, setLoaded, setLoading, withCallState } from './with-call-state'

const UsersStore = signalStore(withState({ users: [] as string[] }), withCallState())

function inject<T>(store: new () => T): T {
  TestBed.configureTestingModule({ providers: [store] })

  return TestBed.inject(store)
}

describe('withCallState() for one request', () => {
  it('starts in init with no loading, loaded or error', () => {
    const store = inject(UsersStore)

    expect(store.callState()).toBe('init')
    expect(store.loading()).toBe(false)
    expect(store.loaded()).toBe(false)
    expect(store.error()).toBeNull()
  })

  it('moves through loading, loaded and error with one field per update', () => {
    const store = inject(UsersStore)

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
})
