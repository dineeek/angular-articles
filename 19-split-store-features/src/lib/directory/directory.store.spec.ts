import { TestBed } from '@angular/core/testing'
import { DirectoryStore, DirectoryStoreInstance } from './directory.store'
import { FakeUserService } from './testing/fake-user.service'
import { Profile, Role, User } from './user'
import { UserService } from './user.service'

const ada: User = { id: 1, name: 'Ada' }
const linus: User = { id: 2, name: 'Linus' }
const admin: Role = { id: 1, name: 'Admin' }
const adaProfile: Profile = { userId: 1, email: 'ada@example.com' }
const linusProfile: Profile = { userId: 2, email: 'linus@example.com' }

describe('DirectoryStore', () => {
  let store: DirectoryStoreInstance
  let userService: FakeUserService

  beforeEach(() => {
    userService = new FakeUserService()
    TestBed.configureTestingModule({
      providers: [{ provide: UserService, useValue: userService }],
    })
    store = TestBed.inject(DirectoryStore)
  })

  function loadUsers(users: User[]): void {
    store.loadUsers()
    userService.respondWithUsers(users)
  }

  function selectUser(id: number | null): void {
    store.selectUser(id)
    TestBed.tick()
  }

  const requestedRoleUserIds = () => userService.roleRequests.map(({ userId }) => userId)

  const requestedProfileUserIds = () => userService.profileRequests.map(({ userId }) => userId)

  it('loads the users', () => {
    loadUsers([ada, linus])

    expect(store.users()).toEqual([ada, linus])
    expect(store.usersLoaded()).toBe(true)
  })

  it('sends no roles or profile request before a user is selected', () => {
    loadUsers([ada, linus])
    TestBed.tick()

    expect(requestedRoleUserIds()).toEqual([])
    expect(requestedProfileUserIds()).toEqual([])
  })

  it('loads the roles and the profile of the selected user', () => {
    loadUsers([ada, linus])
    selectUser(ada.id)
    userService.respondWithRoles([admin])
    userService.respondWithProfile(adaProfile)

    expect(requestedRoleUserIds()).toEqual([ada.id])
    expect(requestedProfileUserIds()).toEqual([ada.id])
    expect(store.roles()).toEqual([admin])
    expect(store.profile()).toEqual(adaProfile)
  })

  it('loads the roles and the profile again when another user is selected', () => {
    loadUsers([ada, linus])
    selectUser(ada.id)
    userService.respondWithProfile(adaProfile)
    selectUser(linus.id)
    userService.respondWithProfile(linusProfile)

    expect(requestedRoleUserIds()).toEqual([ada.id, linus.id])
    expect(requestedProfileUserIds()).toEqual([ada.id, linus.id])
    expect(store.profile()).toEqual(linusProfile)
  })

  it('drops the old roles and profile while another user loads', () => {
    loadUsers([ada, linus])
    selectUser(ada.id)
    userService.respondWithRoles([admin])
    userService.respondWithProfile(adaProfile)
    selectUser(linus.id)

    expect(store.roles()).toEqual([])
    expect(store.profile()).toBeNull()
    expect(store.rolesLoading()).toBe(true)
    expect(store.profileLoading()).toBe(true)
  })

  it('keeps the old roles on screen while a refresh for the same user loads', () => {
    loadUsers([ada, linus])
    selectUser(ada.id)
    userService.respondWithRoles([admin])
    store.loadRoles()

    expect(store.roles()).toEqual([admin])
    expect(store.rolesLoading()).toBe(true)
  })

  it('does not reload the profile when the users reload', () => {
    loadUsers([ada, linus])
    selectUser(ada.id)
    loadUsers([{ ...ada }, { ...linus }])
    TestBed.tick()

    expect(requestedProfileUserIds()).toEqual([ada.id])
  })

  it('loads the profile once the users arrive for a user selected before', () => {
    selectUser(ada.id)
    loadUsers([ada, linus])
    TestBed.tick()

    expect(requestedProfileUserIds()).toEqual([ada.id])
  })

  it('keeps the old users on screen while a refresh loads', () => {
    loadUsers([ada])
    store.loadUsers()

    expect(store.users()).toEqual([ada])
    expect(store.usersLoading()).toBe(true)
  })

  it('never sets loading and error at the same time', () => {
    const steps: [boolean, string | null][] = []
    const record = () => steps.push([store.usersLoading(), store.usersError()])

    store.loadUsers()
    record()
    userService.failUsers(new Error('Server is down'))
    record()
    store.loadUsers()
    record()
    userService.respondWithUsers([ada])
    record()

    expect(steps).toEqual([
      [true, null],
      [false, 'Server is down'],
      [true, null],
      [false, null],
    ])
  })

  it('leaves _selectedUser out of the public type', () => {
    expectTypeOf<DirectoryStoreInstance>().not.toHaveProperty('_selectedUser')
  })

  it('still puts _selectedUser on the instance at runtime', () => {
    expect(Reflect.has(store, '_selectedUser')).toBe(true)
  })
})
