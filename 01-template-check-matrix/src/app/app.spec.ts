import { TestBed } from '@angular/core/testing'
import { App } from './app'

const rowSelectors = [
  'app-recipe-actions',
  'app-recipe-actions-in-if',
  'app-recipe-actions-in-template',
  'app-recipe-list',
  'app-recipe-page',
  'app-recipe-quick-edit',
  'app-ingredient-picker',
  'app-recipe-toolbar',
  'app-recipe-badge',
  'app-recipe-summary',
]

describe('App', () => {
  it('renders the fixed version of every row', async () => {
    const fixture = TestBed.createComponent(App)

    await fixture.whenStable()

    const page = fixture.nativeElement as HTMLElement

    expect(page.querySelector('h1')?.textContent).toBe('Template check matrix')
    expect(rowSelectors.filter((selector) => !page.querySelector(selector))).toEqual([])
  })
})
