import { Component, input } from '@angular/core'
import { User } from './user'

@Component({
  selector: 'lib-user-row',
  template: `<p>{{ user().name }}, {{ user().age }}</p>`,
})
export class UserRow {
  readonly user = input.required<User>()
}
