import { Observable, Subject } from 'rxjs'
import { Profile, Role, User } from '../user'

export interface UserRequest<T> {
  userId: number
  response: Subject<T>
}

export class FakeUserService {
  readonly userRequests: Subject<User[]>[] = []
  readonly roleRequests: UserRequest<Role[]>[] = []
  readonly profileRequests: UserRequest<Profile>[] = []

  getUsers(): Observable<User[]> {
    const response = new Subject<User[]>()

    this.userRequests.push(response)

    return response
  }

  getRoles(userId: number): Observable<Role[]> {
    const response = new Subject<Role[]>()

    this.roleRequests.push({ userId, response })

    return response
  }

  getProfile(userId: number): Observable<Profile> {
    const response = new Subject<Profile>()

    this.profileRequests.push({ userId, response })

    return response
  }

  respondWithUsers(users: User[]): void {
    respond(this.userRequests[this.userRequests.length - 1], users)
  }

  failUsers(error: unknown): void {
    this.userRequests[this.userRequests.length - 1].error(error)
  }

  respondWithRoles(roles: Role[]): void {
    respond(this.roleRequests[this.roleRequests.length - 1].response, roles)
  }

  failRoles(error: unknown): void {
    this.roleRequests[this.roleRequests.length - 1].response.error(error)
  }

  respondWithProfile(profile: Profile): void {
    respond(this.profileRequests[this.profileRequests.length - 1].response, profile)
  }
}

function respond<T>(response: Subject<T>, value: T): void {
  response.next(value)
  response.complete()
}
