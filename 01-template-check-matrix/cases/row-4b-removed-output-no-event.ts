import { Component, signal } from '@angular/core'
import { lentilSoup } from '../src/app/shared/recipe'
import { RenamedRecipeEditor } from './renamed-recipe-editor'

@Component({
  selector: 'app-recipe-quick-edit',
  imports: [RenamedRecipeEditor],
  template: `<app-recipe-editor [recipe]="recipe" (saved)="close()" (cancelled)="close()" />`,
})
export class RecipeQuickEdit {
  readonly recipe = lentilSoup
  readonly isOpen = signal(true)

  close(): void {
    this.isOpen.set(false)
  }
}
