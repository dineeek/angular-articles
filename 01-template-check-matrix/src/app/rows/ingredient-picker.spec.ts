import { CdkScrollable } from '@angular/cdk/scrolling'
import { Component, Type } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { By } from '@angular/platform-browser'
import { IngredientPicker } from './ingredient-picker'

@Component({
  selector: 'app-picker-in-autocomplete-module',
  imports: [MatAutocompleteModule],
  template: `<div cdkScrollable></div>`,
})
class PickerWithAutocompleteModule {}

@Component({
  selector: 'app-picker-without-imports',
  template: `<div cdkScrollable></div>`,
})
class PickerWithoutImports {}

async function countScrollables(component: Type<unknown>): Promise<number> {
  const fixture = TestBed.createComponent(component)

  await fixture.whenStable()

  return fixture.debugElement.queryAll(By.directive(CdkScrollable)).length
}

describe('cdkScrollable', () => {
  it('attaches through MatAutocompleteModule, which re-exports CdkScrollableModule', async () => {
    expect(await countScrollables(PickerWithAutocompleteModule)).toBe(1)
  })

  it('attaches when CdkScrollable is in imports', async () => {
    expect(await countScrollables(IngredientPicker)).toBe(1)
  })

  it('stays a plain attribute, with no error, when nothing provides it', async () => {
    expect(await countScrollables(PickerWithoutImports)).toBe(0)
  })
})
