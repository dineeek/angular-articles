import { TestBed } from '@angular/core/testing'
import { FakeUserService } from '../users/testing/fake-user.service'
import { Role } from '../users/user'
import { UserService } from '../users/user.service'
import { UsersRolesStore } from './users-roles.store'

const admin: Role = { id: 1, name: 'Admin' }

describe('UsersRolesStore', () => {
  let store: InstanceType<typeof UsersRolesStore>
  let userService: FakeUserService

  beforeEach(() => {
    userService = new FakeUserService()
    TestBed.configureTestingModule({
      providers: [{ provide: UserService, useValue: userService }],
    })
    store = TestBed.inject(UsersRolesStore)
  })

  it('tracks users and roles with separate call states', () => {
    store.loadUsers()
    store.loadRoles()
    userService.failUsers(new Error('Server is down'))
    userService.respondWithRoles([admin])

    expect(store.usersError()).toBe('Server is down')
    expect(store.usersLoading()).toBe(false)
    expect(store.rolesLoaded()).toBe(true)
    expect(store.rolesError()).toBeNull()
    expect(store.roles()).toEqual([admin])
  })

  it('skips a roles load while one is running', () => {
    store.loadRoles()
    store.loadRoles()

    expect(userService.roleRequests.length).toBe(1)
    expect(store.rolesLoading()).toBe(true)
  })
})
