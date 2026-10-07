import { inject } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { tapResponse } from '@ngrx/operators'
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { pipe, switchMap, tap } from 'rxjs'
import { setError, setLoaded, setLoading, withCallState } from '../call-state/with-call-state'
import { FakeUserService } from './testing/fake-user.service'
import { User } from './user'
import { UserService } from './user.service'
import { UsersStore } from './users.store'

const ada: User = { id: 1, name: 'Ada', age: 36 }
const linus: User = { id: 2, name: 'Linus', age: 28 }

function setup<T>(store: new () => T): { store: T; userService: FakeUserService } {
  const userService = new FakeUserService()

  TestBed.configureTestingModule({
    providers: [store, { provide: UserService, useValue: userService }],
  })

  return { store: TestBed.inject(store), userService }
}

describe('UsersStore', () => {
  it('is loading while the request runs, then loaded with the users', () => {
    const { store, userService } = setup(UsersStore)

    store.loadUsers()

    expect(store.loading()).toBe(true)
    expect(store.loaded()).toBe(false)

    userService.respondWithUsers([ada, linus])

    expect(store.loading()).toBe(false)
    expect(store.loaded()).toBe(true)
    expect(store.users()).toEqual([ada, linus])
  })

  it('shows the message of an Error', () => {
    const { store, userService } = setup(UsersStore)

    store.loadUsers()
    userService.failUsers(new Error('Server is down'))

    expect(store.error()).toBe('Server is down')
    expect(store.loading()).toBe(false)
  })

  it('shows a string error as it is', () => {
    const { store, userService } = setup(UsersStore)

    store.loadUsers()
    userService.failUsers('Timeout')

    expect(store.error()).toBe('Timeout')
  })

  it('keeps the old list visible while a refresh is loading', () => {
    const { store, userService } = setup(UsersStore)

    store.loadUsers()
    userService.respondWithUsers([ada])
    store.loadUsers()

    expect(store.loading()).toBe(true)
    expect(store.users()).toEqual([ada])
  })

  it('keeps the old list next to the error when a refresh fails', () => {
    const { store, userService } = setup(UsersStore)

    store.loadUsers()
    userService.respondWithUsers([ada])
    store.loadUsers()
    userService.failUsers(new Error('Server is down'))

    expect(store.error()).toBe('Server is down')
    expect(store.users()).toEqual([ada])
  })

  it('never reports loading and an error at the same time', () => {
    const { store, userService } = setup(UsersStore)
    const snapshots: [boolean, string | null][] = []
    const record = () => snapshots.push([store.loading(), store.error()])

    record()
    store.loadUsers()
    record()
    userService.failUsers(new Error('Server is down'))
    record()
    store.loadUsers()
    record()
    userService.respondWithUsers([ada])
    record()

    expect(snapshots).toEqual([
      [false, null],
      [true, null],
      [false, 'Server is down'],
      [true, null],
      [false, null],
    ])
  })

  it('loads again after an error', () => {
    const { store, userService } = setup(UsersStore)

    store.loadUsers()
    userService.failUsers(new Error('Server is down'))
    store.loadUsers()
    userService.respondWithUsers([linus])

    expect(userService.userRequests.length).toBe(2)
    expect(store.users()).toEqual([linus])
    expect(store.error()).toBeNull()
  })
})

const OuterTapResponseStore = signalStore(
  withState<{ users: User[] }>({ users: [] }),
  withCallState(),
  withMethods((store, userService = inject(UserService)) => ({
    loadUsers: rxMethod<void>(
      pipe(
        tap(() => patchState(store, setLoading())),
        switchMap(() => userService.getUsers()),
        tapResponse({
          next: (users) => patchState(store, { users }, setLoaded()),
          error: (error: unknown) => patchState(store, setError(error)),
        }),
      ),
    ),
  })),
)

describe('tapResponse after switchMap instead of inside it', () => {
  it('stops loading for good after the first error', () => {
    const { store, userService } = setup(OuterTapResponseStore)

    store.loadUsers()
    userService.failUsers(new Error('Server is down'))
    store.loadUsers()

    expect(userService.userRequests.length).toBe(1)
    expect(store.loading()).toBe(false)
    expect(store.error()).toBe('Server is down')
  })
})
