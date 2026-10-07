import { Injectable, signal } from '@angular/core'
import { Recipe } from './recipe'

@Injectable({ providedIn: 'root' })
export class RecipeStore {
  private readonly savedRecipes = signal<Recipe[]>([])

  readonly recipes = this.savedRecipes.asReadonly()

  saveRecipe(recipe: Recipe): void {
    this.savedRecipes.update((recipes) => [...recipes, recipe])
  }
}
