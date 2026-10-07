import { Component, signal } from '@angular/core'

@Component({
  selector: 'app-recipe-actions',
  template: `<p>{{ servings() }} servings</p>
    <button type="button" (click)="scaleRecipe(2)">Double it</button>`,
})
export class RecipeActions {
  readonly servings = signal(2)
}
