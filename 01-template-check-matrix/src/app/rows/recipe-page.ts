import { Component, inject, signal } from '@angular/core'
import { Recipe, lentilSoup } from '../shared/recipe'
import { RecipeEditor } from '../shared/recipe-editor'
import { RecipeStore } from '../shared/recipe-store'

@Component({
  selector: 'app-recipe-page',
  imports: [RecipeEditor],
  template: `<app-recipe-editor [recipe]="recipe" (saved)="save($event)" (cancelled)="close()" />`,
})
export class RecipePage {
  private readonly store = inject(RecipeStore)

  readonly recipe = lentilSoup
  readonly isOpen = signal(true)

  save(recipe: Recipe): void {
    this.store.saveRecipe(recipe)
  }

  close(): void {
    this.isOpen.set(false)
  }
}
