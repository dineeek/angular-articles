import { TestBed } from '@angular/core/testing'
import { of, Subject, throwError } from 'rxjs'
import { LaptopBuildApi } from './laptop-build-api'
import { LateReadBuildStore } from './late-read-build.store'
import { Part } from './part'

const ram32: Part = { id: 'ram-32', name: '32 GB RAM' }
const ssd2tb: Part = { id: 'ssd-2tb', name: '2 TB SSD' }

function setup() {
  const api = { savePart: vi.fn<LaptopBuildApi['savePart']>() }

  TestBed.configureTestingModule({
    providers: [LateReadBuildStore, { provide: LaptopBuildApi, useValue: api }],
  })

  return { store: TestBed.inject(LateReadBuildStore), api }
}

describe('LateReadBuildStore', () => {
  describe('with a held-open Subject per save', () => {
    it('shows the answer to a part the user added on the old model', () => {
      const { store, api } = setup()
      const firstSave = new Subject<Part[]>()
      const secondSave = new Subject<Part[]>()
      api.savePart.mockReturnValueOnce(firstSave).mockReturnValueOnce(secondSave)

      store.addPart(ram32)
      store.addPart(ssd2tb)
      store.selectModel('pro-14')
      firstSave.next([ram32])
      firstSave.complete()
      secondSave.next([ram32, ssd2tb])
      secondSave.complete()

      expect(store.parts()).toEqual([ram32, ssd2tb])
      expect(api.savePart).toHaveBeenCalledTimes(2)
    })

    it('sets hasSaveError for a save the user left', () => {
      const { store, api } = setup()
      const firstSave = new Subject<Part[]>()
      api.savePart.mockReturnValueOnce(firstSave)

      store.addPart(ram32)
      store.selectModel('pro-14')
      firstSave.error(new Error('500'))

      expect(store.hasSaveError()).toBe(true)
    })
  })

  describe('with a synchronous of() mock', () => {
    it('passes the stale answer check', () => {
      const { store, api } = setup()
      api.savePart.mockReturnValueOnce(of([ram32])).mockReturnValueOnce(of([ram32, ssd2tb]))

      store.addPart(ram32)
      store.addPart(ssd2tb)
      store.selectModel('pro-14')

      expect(store.parts()).toEqual([])
    })

    it('passes the save error check', () => {
      const { store, api } = setup()
      api.savePart.mockReturnValueOnce(throwError(() => new Error('500')))

      store.addPart(ram32)
      store.selectModel('pro-14')

      expect(store.hasSaveError()).toBe(false)
    })
  })
})
