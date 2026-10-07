import { Component } from '@angular/core'
import { RecipeCard } from '../src/app/shared/recipe-card'

@Component({
  selector: 'app-recipe-list',
  imports: [RecipeCard],
  template: `<app-recipe-card [recipe]="draft" />`,
})
export class RecipeList {
  readonly draft = { name: 'Lentil soup', time: 35 }
}
