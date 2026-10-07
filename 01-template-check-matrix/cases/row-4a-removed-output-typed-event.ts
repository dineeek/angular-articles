import { Component, inject, signal } from '@angular/core'
import { Recipe, lentilSoup } from '../src/app/shared/recipe'
import { RecipeStore } from '../src/app/shared/recipe-store'
import { RenamedRecipeEditor } from './renamed-recipe-editor'

@Component({
  selector: 'app-recipe-page',
  imports: [RenamedRecipeEditor],
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
