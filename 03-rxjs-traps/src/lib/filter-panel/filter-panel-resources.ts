import { httpResource } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { brandsUrl, screenSizesUrl } from './filter-api'

@Injectable()
export class FilterPanelResources {
  readonly brands = httpResource<string[]>(() => brandsUrl, { defaultValue: [] })
  readonly screenSizes = httpResource<number[]>(() => screenSizesUrl, { defaultValue: [] })
}
