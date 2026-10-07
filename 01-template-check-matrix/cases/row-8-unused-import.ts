import { Component } from '@angular/core'
import { lentilSoup } from '../src/app/shared/recipe'
import { RecipeCard } from '../src/app/shared/recipe-card'

@Component({
  selector: 'app-recipe-summary',
  imports: [RecipeCard],
  template: `<p>{{ recipe.title }}, {{ recipe.minutes }} min</p>`,
})
export class RecipeSummary {
  readonly recipe = lentilSoup
}
