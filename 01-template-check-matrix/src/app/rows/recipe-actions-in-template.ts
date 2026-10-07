import { NgTemplateOutlet } from '@angular/common'
import { Component, signal } from '@angular/core'

@Component({
  selector: 'app-recipe-actions-in-template',
  imports: [NgTemplateOutlet],
  template: `<p>{{ servings() }} servings</p>
    <ng-template #portion let-factor>
      <button type="button" (click)="scaleRecipe(factor)">Times {{ factor }}</button>
    </ng-template>
    <ng-container *ngTemplateOutlet="portion; context: { $implicit: 2 }" />`,
})
export class RecipeActionsInTemplate {
  readonly servings = signal(2)

  scaleRecipe(factor: number): void {
    this.servings.update((servings) => servings * factor)
  }
}
