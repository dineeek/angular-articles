import { TestBed } from '@angular/core/testing'
import { ProfileStore } from './profile.store'

describe('ProfileStore with distinct member names', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates the store without an override warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    TestBed.configureTestingModule({ providers: [ProfileStore] })
    const store = TestBed.inject(ProfileStore)

    expect(warn).not.toHaveBeenCalled()
    expect(store.hasProfileError()).toBe(false)
    expect(store.profileError()).toBeNull()
  })
})
