import { TestBed } from '@angular/core/testing'
import { of, Subject } from 'rxjs'
import { LaptopBuildApi } from '../../src/lib/laptop-build/laptop-build-api'
import { LaptopBuildStore } from '../../src/lib/laptop-build/laptop-build.store'
import { LateReadBuildStore } from '../../src/lib/laptop-build/late-read-build.store'
import { Part } from '../../src/lib/laptop-build/part'

const ram32: Part = { id: 'ram-32', name: '32 GB RAM' }
const ssd2tb: Part = { id: 'ssd-2tb', name: '2 TB SSD' }

const createApi = () => ({ savePart: vi.fn<LaptopBuildApi['savePart']>() })

describe.each([
  { name: 'LateReadBuildStore', Store: LateReadBuildStore },
  { name: 'LaptopBuildStore', Store: LaptopBuildStore },
])('$name', ({ Store }) => {
  let api: ReturnType<typeof createApi>
  let store: LateReadBuildStore | LaptopBuildStore

  beforeEach(() => {
    api = createApi()
    TestBed.configureTestingModule({
      providers: [Store, { provide: LaptopBuildApi, useValue: api }],
    })
    store = TestBed.inject<LateReadBuildStore | LaptopBuildStore>(Store)
  })

  it('ignores a save answer for a model the user has left', () => {
    const firstSave = new Subject<Part[]>()
    api.savePart.mockReturnValue(of([]))
    api.savePart.mockReturnValueOnce(firstSave)

    store.addPart(ram32)
    store.addPart(ssd2tb)
    store.selectModel('pro-14')

    firstSave.next([ram32])
    firstSave.complete()

    expect(store.parts()).toEqual([])
    expect(api.savePart).toHaveBeenCalledTimes(1)
  })
})
