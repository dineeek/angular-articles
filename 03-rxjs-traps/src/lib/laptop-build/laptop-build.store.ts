import { computed, inject, Injectable } from '@angular/core'
import { tapResponse } from '@ngrx/operators'
import { patchState, signalState } from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { concatMap, EMPTY, pipe } from 'rxjs'
import { LaptopBuildApi } from './laptop-build-api'
import { Part } from './part'

export interface PartChange {
  part: Part
  isAdded: boolean
  buildKey: string
}

interface BuildState {
  buildKey: string
  parts: Part[]
  pendingSaves: number
  hasSaveError: boolean
}

@Injectable()
export class LaptopBuildStore {
  private readonly api = inject(LaptopBuildApi)
  private readonly state = signalState<BuildState>({
    buildKey: 'air-13',
    parts: [],
    pendingSaves: 0,
    hasSaveError: false,
  })

  readonly buildKey = this.state.buildKey
  readonly parts = this.state.parts
  readonly hasSaveError = this.state.hasSaveError
  readonly isSaving = computed(() => this.state.pendingSaves() > 0)

  private readonly savePart = rxMethod<PartChange>(
    pipe(concatMap((change) => this.savePart$(change))),
  )

  selectModel(buildKey: string) {
    patchState(this.state, { buildKey, parts: [], hasSaveError: false })
  }

  addPart(part: Part) {
    this.queueSave({ part, isAdded: true, buildKey: this.buildKey() })
  }

  removePart(part: Part) {
    this.queueSave({ part, isAdded: false, buildKey: this.buildKey() })
  }

  private queueSave(change: PartChange) {
    patchState(this.state, ({ pendingSaves }) => ({ pendingSaves: pendingSaves + 1 }))
    this.savePart(change)
  }

  private savePart$(change: PartChange) {
    const isStale = () => this.buildKey() !== change.buildKey

    if (isStale()) {
      this.finishSave()

      return EMPTY
    }

    return this.api.savePart({ part: change.part, isAdded: change.isAdded }).pipe(
      tapResponse({
        next: (parts) => {
          if (!isStale()) {
            patchState(this.state, { parts })
          }
        },
        error: () => {
          if (!isStale()) {
            patchState(this.state, { hasSaveError: true })
          }
        },
        finalize: () => this.finishSave(),
      }),
    )
  }

  private finishSave() {
    patchState(this.state, ({ pendingSaves }) => ({ pendingSaves: pendingSaves - 1 }))
  }
}
