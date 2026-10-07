import { Component, input } from '@angular/core'
import { Recipe } from './recipe'

@Component({
  selector: 'app-recipe-card',
  template: `<h3>{{ recipe().title }}</h3>
    <p>{{ recipe().minutes }} min</p>`,
})
export class RecipeCard {
  readonly recipe = input.required<Recipe>()
}
