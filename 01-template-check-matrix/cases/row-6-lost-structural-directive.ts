import { Component, signal } from '@angular/core'

@Component({
  selector: 'app-recipe-toolbar',
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
