import { Component } from '@angular/core'
import { RecipeCard } from '../shared/recipe-card'

@Component({
  selector: 'app-recipe-list',
  imports: [RecipeCard],
  template: `<app-recipe-card [recipe]="draft" />`,
})
export class RecipeList {
  readonly draft = { id: 2, title: 'Lentil soup', minutes: 35 }
}
