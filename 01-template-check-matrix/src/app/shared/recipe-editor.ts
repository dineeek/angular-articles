import { Component, input, output } from '@angular/core'
import { Recipe } from './recipe'

@Component({
  selector: 'app-recipe-editor',
  template: `<p>Editing {{ recipe().title }}</p>
    <button type="button" (click)="saved.emit(recipe())">Save</button>
    <button type="button" (click)="cancelled.emit()">Cancel</button>`,
})
export class RecipeEditor {
  readonly recipe = input.required<Recipe>()
  readonly saved = output<Recipe>()
  readonly cancelled = output<void>()
}
