import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { Observable } from 'rxjs'

export const brandsUrl = '/api/filters/brands'
export const screenSizesUrl = '/api/filters/screen-sizes'

@Injectable({ providedIn: 'root' })
export class FilterApi {
  private readonly http = inject(HttpClient)

  getBrands(): Observable<string[]> {
    return this.http.get<string[]>(brandsUrl)
  }

  getScreenSizes(): Observable<number[]> {
    return this.http.get<number[]>(screenSizesUrl)
  }
}
