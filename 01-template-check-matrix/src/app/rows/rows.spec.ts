import { Type } from '@angular/core'
import { renderAndClick, testBedColumns } from '../../testing/testbed-columns'
import { IngredientPicker } from './ingredient-picker'
import { RecipeActions } from './recipe-actions'
import { RecipeActionsInIf } from './recipe-actions-in-if'
import { RecipeActionsInTemplate } from './recipe-actions-in-template'
import { RecipeBadge } from './recipe-badge'
import { RecipeList } from './recipe-list'
import { RecipePage } from './recipe-page'
import { RecipeQuickEdit } from './recipe-quick-edit'
import { RecipeSummary } from './recipe-summary'
import { RecipeToolbar } from './recipe-toolbar'

const fixedRows: [string, Type<unknown>][] = [
  ['1', RecipeActions],
  ['2a', RecipeActionsInIf],
  ['2b', RecipeActionsInTemplate],
  ['3', RecipeList],
  ['4a', RecipePage],
  ['4b', RecipeQuickEdit],
  ['5', IngredientPicker],
  ['6', RecipeToolbar],
  ['7', RecipeBadge],
  ['8', RecipeSummary],
]

describe.each(fixedRows)('fixed row %s', (_row, component) => {
  it.each(testBedColumns)('renders and clicks with no error in %s', async (column) => {
    expect(await renderAndClick(component, column)).toEqual({
      uncaughtErrors: [],
      consoleErrors: [],
    })
  })
})
