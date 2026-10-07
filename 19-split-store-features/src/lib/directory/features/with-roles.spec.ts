import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { signalStore } from '@ngrx/signals'
import { FakeUserService } from '../testing/fake-user.service'
import { Role } from '../user'
import { UserService } from '../user.service'
import { withRoles } from './with-roles'

const admin: Role = { id: 1, name: 'Admin' }
const editor: Role = { id: 2, name: 'Editor' }

function setup() {
  const selectedUserId = signal<number | null>(7)
  const RolesStore = signalStore(withRoles({ selectedUserId }))
  const userService = new FakeUserService()

  TestBed.configureTestingModule({
    providers: [RolesStore, { provide: UserService, useValue: userService }],
  })

  return { store: TestBed.inject(RolesStore), selectedUserId, userService }
}

describe('withRoles', () => {
  it('loads the roles of the user the source selects', () => {
    const { store, userService } = setup()

    store.loadRoles()
    userService.respondWithRoles([admin])

    expect(userService.roleRequests.map(({ userId }) => userId)).toEqual([7])
    expect(store.roles()).toEqual([admin])
    expect(store.rolesLoaded()).toBe(true)
  })

  it('sends no request while the source selects no user', () => {
    const { store, selectedUserId, userService } = setup()

    selectedUserId.set(null)
    store.loadRoles()

    expect(userService.roleRequests).toEqual([])
    expect(store.rolesCallState()).toBe('init')
  })

  it('drops the answer for a user that is no longer selected', () => {
    const { store, selectedUserId, userService } = setup()

    store.loadRoles()
    selectedUserId.set(8)
    store.loadRoles()
    userService.roleRequests[0].response.next([admin])

    expect(userService.roleRequests.map(({ userId }) => userId)).toEqual([7, 8])
    expect(store.roles()).toEqual([])

    userService.respondWithRoles([editor])

    expect(store.roles()).toEqual([editor])
  })

  it('records the error and stops loading', () => {
    const { store, userService } = setup()

    store.loadRoles()
    userService.failRoles(new Error('Roles are down'))

    expect(store.rolesError()).toBe('Roles are down')
    expect(store.rolesLoading()).toBe(false)
  })
})
