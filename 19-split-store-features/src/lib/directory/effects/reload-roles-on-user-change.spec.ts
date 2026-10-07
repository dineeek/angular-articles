import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { fakeRxMethod } from '../testing/fake-rx-method'
import { reloadRolesOnUserChange } from './reload-roles-on-user-change'

function setup() {
  const selectedUserId = signal<number | null>(null)
  const clearRoles = vi.fn()
  const loadRoles = fakeRxMethod()

  TestBed.runInInjectionContext(() =>
    reloadRolesOnUserChange({ selectedUserId, clearRoles, loadRoles }),
  )
  TestBed.tick()

  return { selectedUserId, clearRoles, loadRoles }
}

describe('reloadRolesOnUserChange', () => {
  it('calls loadRoles once when it starts and again for each selected user', () => {
    const { selectedUserId, loadRoles } = setup()

    selectedUserId.set(3)
    TestBed.tick()

    expect(loadRoles).toHaveBeenCalledTimes(2)
  })

  it('clears the roles before it loads the roles of the next user', () => {
    const { selectedUserId, clearRoles, loadRoles } = setup()

    selectedUserId.set(3)
    TestBed.tick()

    expect(clearRoles).toHaveBeenCalledTimes(2)
    expect(clearRoles.mock.invocationCallOrder[1]).toBeLessThan(
      loadRoles.mock.invocationCallOrder[1],
    )
  })
})
