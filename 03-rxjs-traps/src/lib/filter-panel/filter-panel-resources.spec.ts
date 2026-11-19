import { HttpErrorResponse, provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { ApplicationRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { brandsUrl, screenSizesUrl } from './filter-api'
import { FilterPanelResources } from './filter-panel-resources'

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), FilterPanelResources],
  })

  const resources = TestBed.inject(FilterPanelResources)

  TestBed.tick()

  return { resources, http: TestBed.inject(HttpTestingController) }
}

describe('FilterPanelResources', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify())

  it('keeps the brands when the screen sizes fail', async () => {
    const { resources, http } = setup()

    http.expectOne(brandsUrl).flush(['Acme', 'Nimbus'])
    http
      .expectOne(screenSizesUrl)
      .flush('Server error', { status: 500, statusText: 'Internal Server Error' })
    await TestBed.inject(ApplicationRef).whenStable()

    expect(resources.brands.value()).toEqual(['Acme', 'Nimbus'])
    expect(resources.screenSizes.status()).toBe('error')
    expect(resources.screenSizes.error()).toBeInstanceOf(HttpErrorResponse)
    expect(resources.screenSizes.hasValue()).toBe(false)
  })

  it('throws from value() of the resource that failed', async () => {
    const { resources, http } = setup()

    http.expectOne(brandsUrl).flush(['Acme', 'Nimbus'])
    http
      .expectOne(screenSizesUrl)
      .flush('Server error', { status: 500, statusText: 'Internal Server Error' })
    await TestBed.inject(ApplicationRef).whenStable()

    expect(() => resources.screenSizes.value()).toThrow()
  })
})
