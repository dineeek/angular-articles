import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { Profile, Role, User } from './user'

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient)

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users')
  }

  getRoles(userId: number): Observable<Role[]> {
    return this.http.get<Role[]>(`/api/users/${userId}/roles`)
  }

  getProfile(userId: number): Observable<Profile> {
    return this.http.get<Profile>(`/api/users/${userId}/profile`)
  }
}
