import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { Part } from './part'

export interface SavePartRequest {
  part: Part
  isAdded: boolean
}

@Injectable({ providedIn: 'root' })
export class LaptopBuildApi {
  private readonly http = inject(HttpClient)

  savePart(change: SavePartRequest): Observable<Part[]> {
    return this.http.post<Part[]>('/api/build/parts', change)
  }
}
