import { Component } from '@angular/core'

@Component({
  selector: 'app-ingredient-picker',
  template: `<div class="ingredient-list" cdkScrollable>
    @for (ingredient of ingredients; track ingredient) {
      <p>{{ ingredient }}</p>
    }
  </div>`,
})
export class IngredientPicker {
  readonly ingredients = ['Lentils', 'Carrot', 'Cumin']
}
