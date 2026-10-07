import { Component, signal } from '@angular/core'
import { PermissionDirective } from '../shared/permission'

@Component({
  selector: 'app-recipe-toolbar',
  imports: [PermissionDirective],
  template: `<button *appPermission="'recipe:delete'" type="button" (click)="remove()">
    Delete
  </button>`,
})
export class RecipeToolbar {
  readonly isRemoved = signal(false)

  remove(): void {
    this.isRemoved.set(true)
  }
}
