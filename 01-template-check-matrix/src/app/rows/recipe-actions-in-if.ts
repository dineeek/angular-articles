import { Component, signal } from '@angular/core'

@Component({
  selector: 'app-recipe-actions-in-if',
  template: `<p>{{ servings() }} servings</p>
    @if (isEditable()) {
      <button type="button" (click)="scaleRecipe(2)">Double it</button>
    }`,
})
export class RecipeActionsInIf {
  readonly servings = signal(2)
  readonly isEditable = signal(true)

  scaleRecipe(factor: number): void {
    this.servings.update((servings) => servings * factor)
  }
}
