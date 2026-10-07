import { Component } from '@angular/core'
import { lentilSoup } from '../shared/recipe'

@Component({
  selector: 'app-recipe-summary',
  template: `<p>{{ recipe.title }}, {{ recipe.minutes }} min</p>`,
})
export class RecipeSummary {
  readonly recipe = lentilSoup
}
