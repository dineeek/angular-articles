import { TestBed } from '@angular/core/testing'
import { of, Subject, throwError } from 'rxjs'
import { LaptopBuildApi } from './laptop-build-api'
import { LaptopBuildStore } from './laptop-build.store'
import { Part } from './part'

const ram32: Part = { id: 'ram-32', name: '32 GB RAM' }
const ssd2tb: Part = { id: 'ssd-2tb', name: '2 TB SSD' }

function setup() {
  const api = { savePart: vi.fn<LaptopBuildApi['savePart']>() }

  TestBed.configureTestingModule({
    providers: [LaptopBuildStore, { provide: LaptopBuildApi, useValue: api }],
  })

  return { store: TestBed.inject(LaptopBuildStore), api }
}

describe('LaptopBuildStore', () => {
  it('shows the parts a save answers with', () => {
    const { store, api } = setup()
    const save = new Subject<Part[]>()
    api.savePart.mockReturnValueOnce(save)

    store.addPart(ram32)
    save.next([ram32])
    save.complete()

    expect(api.savePart.mock.calls).toEqual([[{ part: ram32, isAdded: true }]])
    expect(store.parts()).toEqual([ram32])
    expect(store.hasSaveError()).toBe(false)
  })

  it('sends isAdded false for a removed part', () => {
    const { store, api } = setup()
    api.savePart.mockReturnValueOnce(of([]))

    store.removePart(ram32)

    expect(api.savePart.mock.calls).toEqual([[{ part: ram32, isAdded: false }]])
    expect(store.parts()).toEqual([])
  })

  it('clears the parts when the user selects another model', () => {
    const { store, api } = setup()
    api.savePart.mockReturnValueOnce(of([ram32]))

    store.addPart(ram32)

    expect(store.parts()).toEqual([ram32])

    store.selectModel('pro-14')

    expect(store.buildKey()).toBe('pro-14')
    expect(store.parts()).toEqual([])
  })

  it('clears hasSaveError when the user selects another model', () => {
    const { store, api } = setup()
    api.savePart.mockReturnValueOnce(throwError(() => new Error('500')))

    store.addPart(ram32)

    expect(store.hasSaveError()).toBe(true)

    store.selectModel('pro-14')

    expect(store.hasSaveError()).toBe(false)
  })

  it('ignores a save answer for a model the user has left', () => {
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

    expect(store.parts()).toEqual([])
    expect(api.savePart).toHaveBeenCalledTimes(1)
  })

  it('keeps hasSaveError false when a save fails after the model change', () => {
    const { store, api } = setup()
    const firstSave = new Subject<Part[]>()
    api.savePart.mockReturnValueOnce(firstSave)

    store.addPart(ram32)
    store.selectModel('pro-14')
    firstSave.error(new Error('500'))

    expect(store.hasSaveError()).toBe(false)
  })

  it('sets hasSaveError when a save for the current model fails', () => {
    const { store, api } = setup()
    const save = new Subject<Part[]>()
    api.savePart.mockReturnValueOnce(save)

    store.addPart(ram32)
    save.error(new Error('500'))

    expect(store.hasSaveError()).toBe(true)
    expect(store.isSaving()).toBe(false)
  })

  it('keeps isSaving true while a queued save waits', () => {
    const { store, api } = setup()
    const firstSave = new Subject<Part[]>()
    const secondSave = new Subject<Part[]>()
    api.savePart.mockReturnValueOnce(firstSave).mockReturnValueOnce(secondSave)

    store.addPart(ram32)
    store.addPart(ssd2tb)
    firstSave.next([ram32])
    firstSave.complete()

    expect(store.isSaving()).toBe(true)

    secondSave.next([ram32, ssd2tb])
    secondSave.complete()

    expect(store.isSaving()).toBe(false)
    expect(store.parts()).toEqual([ram32, ssd2tb])
  })

  it('clears isSaving when it drops a queued save for the old model', () => {
    const { store, api } = setup()
    const firstSave = new Subject<Part[]>()
    const secondSave = new Subject<Part[]>()
    api.savePart.mockReturnValueOnce(firstSave).mockReturnValueOnce(secondSave)

    store.addPart(ram32)
    store.addPart(ssd2tb)
    store.selectModel('pro-14')
    firstSave.next([ram32])
    firstSave.complete()

    expect(store.isSaving()).toBe(false)
  })
})
