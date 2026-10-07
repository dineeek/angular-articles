import { Component, inject } from '@angular/core'
import { Spinner } from './spinner'
import { UserRow } from './user-row'
import { UsersStore } from './users.store'

@Component({
  selector: 'lib-users-list',
  imports: [Spinner, UserRow],
  providers: [UsersStore],
  template: `
    @if (store.error(); as message) {
      <p class="error">{{ message }}</p>
    }

    @if (store.loading()) {
      <lib-spinner />
    }

    @for (user of store.users(); track user.id) {
      <lib-user-row [user]="user" />
    } @empty {
      @if (store.loaded()) {
        <p>No users found.</p>
      }
    }
  `,
})
export class UsersList {
  protected readonly store = inject(UsersStore)

  constructor() {
    this.store.loadUsers()
  }
}
