import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { Role, User } from './user'

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient)

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users')
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>('/api/roles')
  }
}
