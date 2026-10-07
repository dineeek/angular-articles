import { Component, signal } from '@angular/core'

@Component({
  selector: 'app-recipe-badge',
  template: `@if (isVegetarian) {
    <span>Vegetarian</span>
  }`,
})
export class RecipeBadge {
  readonly isVegetarian = signal(false)
}
