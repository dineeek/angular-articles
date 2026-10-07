import { Type } from '@angular/core'
import { testBedColumns } from '../src/testing/testbed-columns'
import { RecipeActions } from './.matrix/jit/row-1-missing-method'
import { RecipeActionsInIf } from './.matrix/jit/row-2a-missing-method-in-if'
import { RecipeActionsInTemplate } from './.matrix/jit/row-2b-missing-method-in-ng-template'
import { RecipeList } from './.matrix/jit/row-3-wrong-input-shape'
import { RecipePage } from './.matrix/jit/row-4a-removed-output-typed-event'
import { RecipeQuickEdit } from './.matrix/jit/row-4b-removed-output-no-event'
import { IngredientPicker } from './.matrix/jit/row-5-lost-cdk-scrollable'
import { RecipeToolbar } from './.matrix/jit/row-6-lost-structural-directive'
import { RecipeBadge } from './.matrix/jit/row-7-signal-not-called'
import { RecipeSummary } from './.matrix/jit/row-8-unused-import'
import { expectCleanRender } from './expect-clean-render'

const brokenRows: [string, Type<unknown>][] = [
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

describe.each(brokenRows)('row %s', (_row, component) => {
  it.each(testBedColumns)('%s', (column) => expectCleanRender(component, column))
})
