import { TestBed } from '@angular/core/testing'
import { catchError, of, throwError } from 'rxjs'
import { FilterApi } from './filter-api'
import { FilterPanelLoader } from './filter-panel-loader'

function setup() {
  const api = {
    getBrands: vi.fn<FilterApi['getBrands']>(() => of(['Acme', 'Nimbus'])),
    getScreenSizes: vi.fn<FilterApi['getScreenSizes']>(() => throwError(() => new Error('500'))),
  }

  TestBed.configureTestingModule({ providers: [{ provide: FilterApi, useValue: api }] })

  return { loader: TestBed.inject(FilterPanelLoader), next: vi.fn(), complete: vi.fn() }
}

describe('FilterPanelLoader', () => {
  it('emits nothing when one list fails and catchError returns []', () => {
    const { loader, next, complete } = setup()

    loader.loadWithEmptyArray().subscribe({ next, complete })

    expect(next).not.toHaveBeenCalled()
    expect(complete).toHaveBeenCalledOnce()
  })

  it('emits the fallback when catchError returns of([])', () => {
    const { loader, next, complete } = setup()

    loader.loadWithFallback().subscribe({ next, complete })

    expect(next.mock.calls).toEqual([[{ brands: ['Acme', 'Nimbus'], screenSizes: [] }]])
    expect(complete).toHaveBeenCalledOnce()
  })

  it('keeps hasError next to the fallback of the list that failed', () => {
    const { loader, next, complete } = setup()

    loader.loadWithErrorState().subscribe({ next, complete })

    expect(next.mock.calls).toEqual([
      [
        {
          brands: { items: ['Acme', 'Nimbus'], hasError: false },
          screenSizes: { items: [], hasError: true },
        },
      ],
    ])
    expect(complete).toHaveBeenCalledOnce()
  })
})

describe('catchError with a bare array', () => {
  it('emits the items of a non-empty array one by one', () => {
    const next = vi.fn()

    throwError(() => new Error('500'))
      .pipe(catchError(() => ['Acme', 'Nimbus']))
      .subscribe(next)

    expect(next.mock.calls).toEqual([['Acme'], ['Nimbus']])
  })
})
