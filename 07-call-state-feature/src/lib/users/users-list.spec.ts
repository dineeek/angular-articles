import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FakeUserService } from './testing/fake-user.service'
import { User } from './user'
import { UserService } from './user.service'
import { UsersList } from './users-list'
import { UsersStore } from './users.store'

const ada: User = { id: 1, name: 'Ada', age: 36 }

describe('UsersList', () => {
  let fixture: ComponentFixture<UsersList>
  let userService: FakeUserService

  const element = (): HTMLElement => fixture.nativeElement
  const rows = () =>
    Array.from(element().querySelectorAll('lib-user-row'), (row) => row.textContent)
  const hasSpinner = () => element().querySelector('lib-spinner') !== null
  const errorText = () => element().querySelector('.error')?.textContent ?? null
  const isEmptyMessageShown = () => element().textContent?.includes('No users found.') ?? false

  beforeEach(async () => {
    userService = new FakeUserService()
    TestBed.configureTestingModule({
      imports: [UsersList],
      providers: [{ provide: UserService, useValue: userService }],
    })
    fixture = TestBed.createComponent(UsersList)
    await fixture.whenStable()
  })

  it('shows the spinner and no empty message during the first load', () => {
    expect(hasSpinner()).toBe(true)
    expect(isEmptyMessageShown()).toBe(false)
    expect(rows()).toEqual([])
  })

  it('shows the empty message only after a load returns no users', async () => {
    userService.respondWithUsers([])
    await fixture.whenStable()

    expect(hasSpinner()).toBe(false)
    expect(isEmptyMessageShown()).toBe(true)
  })

  it('keeps the old rows on screen while a refresh is loading', async () => {
    userService.respondWithUsers([ada])
    await fixture.whenStable()

    fixture.debugElement.injector.get(UsersStore).loadUsers()
    await fixture.whenStable()

    expect(hasSpinner()).toBe(true)
    expect(rows()).toEqual(['Ada, 36'])
  })

  it('shows the error above the old rows when a refresh fails', async () => {
    userService.respondWithUsers([ada])
    await fixture.whenStable()

    fixture.debugElement.injector.get(UsersStore).loadUsers()
    userService.failUsers(new Error('Server is down'))
    await fixture.whenStable()

    expect(errorText()).toBe('Server is down')
    expect(hasSpinner()).toBe(false)
    expect(rows()).toEqual(['Ada, 36'])
  })
})
