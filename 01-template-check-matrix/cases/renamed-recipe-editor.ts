import { Component, input, output } from '@angular/core'
import { Recipe } from '../src/app/shared/recipe'

@Component({
  selector: 'app-recipe-editor',
  template: `<p>Editing {{ recipe().title }}</p>
    <button type="button" (click)="submitted.emit(recipe())">Save</button>
    <button type="button" (click)="cancelled.emit()">Cancel</button>`,
})
export class RenamedRecipeEditor {
  readonly recipe = input.required<Recipe>()
  readonly submitted = output<Recipe>()
  readonly cancelled = output<void>()
}
