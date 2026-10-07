import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { fakeRxMethod } from '../testing/fake-rx-method'
import { User } from '../user'
import { reloadProfileOnUserChange } from './reload-profile-on-user-change'

const ada: User = { id: 3, name: 'Ada' }
const linus: User = { id: 4, name: 'Linus' }

function setup(loadProfileReads?: () => unknown) {
  const selectedUser = signal<User | null>(null)
  const clearProfile = vi.fn()
  const loadProfile = fakeRxMethod(loadProfileReads)

  TestBed.runInInjectionContext(() =>
    reloadProfileOnUserChange({ _selectedUser: selectedUser, clearProfile, loadProfile }),
  )
  TestBed.tick()

  return { selectedUser, clearProfile, loadProfile }
}

describe('reloadProfileOnUserChange', () => {
  it('calls loadProfile once when it starts', () => {
    const { loadProfile } = setup()

    expect(loadProfile).toHaveBeenCalledTimes(1)
  })

  it('calls loadProfile once the selected user can be resolved', () => {
    const { selectedUser, loadProfile } = setup()

    selectedUser.set(ada)
    TestBed.tick()

    expect(loadProfile).toHaveBeenCalledTimes(2)
  })

  it('calls loadProfile again when another user is selected', () => {
    const { selectedUser, loadProfile } = setup()

    selectedUser.set(ada)
    TestBed.tick()
    selectedUser.set(linus)
    TestBed.tick()

    expect(loadProfile).toHaveBeenCalledTimes(3)
  })

  it('does not call loadProfile when the users reload with a copy of the same user', () => {
    const { selectedUser, loadProfile } = setup()

    selectedUser.set(ada)
    TestBed.tick()
    selectedUser.set({ ...ada })
    TestBed.tick()

    expect(loadProfile).toHaveBeenCalledTimes(2)
  })

  it('clears the profile before it loads the profile of the next user', () => {
    const { selectedUser, clearProfile, loadProfile } = setup()

    selectedUser.set(ada)
    TestBed.tick()

    expect(clearProfile).toHaveBeenCalledTimes(2)
    expect(clearProfile.mock.invocationCallOrder[1]).toBeLessThan(
      loadProfile.mock.invocationCallOrder[1],
    )
  })

  it('does not react to the signals that loadProfile reads', () => {
    const users = signal(['Ada'])
    const { loadProfile } = setup(() => users())

    users.set(['Ada', 'Linus'])
    TestBed.tick()

    expect(loadProfile).toHaveBeenCalledTimes(1)
  })
})
