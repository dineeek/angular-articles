import { Component } from '@angular/core'
import { IngredientPicker } from './rows/ingredient-picker'
import { RecipeActions } from './rows/recipe-actions'
import { RecipeActionsInIf } from './rows/recipe-actions-in-if'
import { RecipeActionsInTemplate } from './rows/recipe-actions-in-template'
import { RecipeBadge } from './rows/recipe-badge'
import { RecipeList } from './rows/recipe-list'
import { RecipePage } from './rows/recipe-page'
import { RecipeQuickEdit } from './rows/recipe-quick-edit'
import { RecipeSummary } from './rows/recipe-summary'
import { RecipeToolbar } from './rows/recipe-toolbar'

@Component({
  selector: 'app-root',
  imports: [
    IngredientPicker,
    RecipeActions,
    RecipeActionsInIf,
    RecipeActionsInTemplate,
    RecipeBadge,
    RecipeList,
    RecipePage,
    RecipeQuickEdit,
    RecipeSummary,
    RecipeToolbar,
  ],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
