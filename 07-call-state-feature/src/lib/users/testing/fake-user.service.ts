import { Observable, Subject } from 'rxjs'
import { Role, User } from '../user'

export class FakeUserService {
  readonly userRequests: Subject<User[]>[] = []
  readonly roleRequests: Subject<Role[]>[] = []

  getUsers(): Observable<User[]> {
    const request = new Subject<User[]>()

    this.userRequests.push(request)

    return request
  }

  getRoles(): Observable<Role[]> {
    const request = new Subject<Role[]>()

    this.roleRequests.push(request)

    return request
  }

  respondWithUsers(users: User[]): void {
    const request = this.userRequests[this.userRequests.length - 1]

    request.next(users)
    request.complete()
  }

  failUsers(error: unknown): void {
    this.userRequests[this.userRequests.length - 1].error(error)
  }

  respondWithRoles(roles: Role[]): void {
    const request = this.roleRequests[this.roleRequests.length - 1]

    request.next(roles)
    request.complete()
  }
}
