import { Component, signal } from '@angular/core'
import { lentilSoup } from '../shared/recipe'
import { RecipeEditor } from '../shared/recipe-editor'

@Component({
  selector: 'app-recipe-quick-edit',
  imports: [RecipeEditor],
  template: `<app-recipe-editor [recipe]="recipe" (saved)="close()" (cancelled)="close()" />`,
})
export class RecipeQuickEdit {
  readonly recipe = lentilSoup
  readonly isOpen = signal(true)

  close(): void {
    this.isOpen.set(false)
  }
}
