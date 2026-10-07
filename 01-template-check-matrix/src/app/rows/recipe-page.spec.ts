import { Component, input, output } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { Recipe, lentilSoup } from '../shared/recipe'
import { RecipeEditor } from '../shared/recipe-editor'
import { RecipeStore } from '../shared/recipe-store'
import { RecipePage } from './recipe-page'

@Component({ selector: 'app-recipe-editor', template: '' })
class RecipeEditorStub implements Pick<RecipeEditor, 'recipe' | 'saved' | 'cancelled'> {
  readonly recipe = input.required<Recipe>()
  readonly saved = output<Recipe>()
  readonly cancelled = output<void>()
}

describe('RecipePage', () => {
  const store = { saveRecipe: vi.fn() }

  beforeEach(() => {
    store.saveRecipe.mockClear()
    TestBed.configureTestingModule({
      imports: [RecipePage],
      providers: [{ provide: RecipeStore, useValue: store }],
    }).overrideComponent(RecipePage, {
      remove: { imports: [RecipeEditor] },
      add: { imports: [RecipeEditorStub] },
    })
  })

  async function renderEditor() {
    const fixture = TestBed.createComponent(RecipePage)

    await fixture.whenStable()

    const editor = fixture.debugElement.query(By.directive(RecipeEditorStub))
      .componentInstance as RecipeEditorStub

    return { fixture, editor }
  }

  it('saves the recipe the editor emits', async () => {
    const { editor } = await renderEditor()

    editor.saved.emit(lentilSoup)

    expect(store.saveRecipe).toHaveBeenCalledWith(lentilSoup)
  })

  it('closes when the editor cancels', async () => {
    const { fixture, editor } = await renderEditor()

    editor.cancelled.emit()

    expect(fixture.componentInstance.isOpen()).toBe(false)
  })
})
