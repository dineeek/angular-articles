import { TestBed } from '@angular/core/testing'
import { getState, patchState } from '@ngrx/signals'
import { unprotected } from '@ngrx/signals/testing'
import { ProfileStore } from './profile.store'

describe('ProfileStore with a colliding member name', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('warns once that profileError cannot be overridden', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    TestBed.configureTestingModule({ providers: [ProfileStore] })
    TestBed.inject(ProfileStore)

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      '@ngrx/signals: SignalStore members cannot be overridden.',
      'Trying to override:',
      'profileError',
    )
  })

  it('exposes the derived signal and hides the state field', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    TestBed.configureTestingModule({ providers: [ProfileStore] })
    const store = TestBed.inject(ProfileStore)

    patchState(unprotected(store), { profileError: true })

    expect(getState(store).profileError).toBe(true)
    expect(store.profileError()).toBeNull()
  })
})
