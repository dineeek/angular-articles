import { inject, Injectable } from '@angular/core'
import { catchError, forkJoin, map, Observable, of } from 'rxjs'
import { FilterApi } from './filter-api'

export interface FilterLists {
  brands: string[]
  screenSizes: number[]
}

export interface LoadedList<T> {
  items: T[]
  hasError: boolean
}

export interface CheckedFilterLists {
  brands: LoadedList<string>
  screenSizes: LoadedList<number>
}

export const loadList = <T>(request$: Observable<T[]>): Observable<LoadedList<T>> =>
  request$.pipe(
    map((items) => ({ items, hasError: false })),
    catchError(() => of({ items: [] as T[], hasError: true })),
  )

@Injectable({ providedIn: 'root' })
export class FilterPanelLoader {
  private readonly api = inject(FilterApi)

  loadWithEmptyArray(): Observable<FilterLists> {
    return forkJoin({
      brands: this.api.getBrands().pipe(catchError(() => [])),
      screenSizes: this.api.getScreenSizes().pipe(catchError(() => [])),
    })
  }

  loadWithFallback(): Observable<FilterLists> {
    return forkJoin({
      brands: this.api.getBrands().pipe(catchError(() => of([]))),
      screenSizes: this.api.getScreenSizes().pipe(catchError(() => of([]))),
    })
  }

  loadWithErrorState(): Observable<CheckedFilterLists> {
    return forkJoin({
      brands: loadList(this.api.getBrands()),
      screenSizes: loadList(this.api.getScreenSizes()),
    })
  }
}
