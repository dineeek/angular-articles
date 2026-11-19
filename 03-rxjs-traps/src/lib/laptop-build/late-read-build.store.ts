import { computed, inject, Injectable } from '@angular/core'
import { tapResponse } from '@ngrx/operators'
import { patchState, signalState } from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { concatMap, pipe } from 'rxjs'
import { LaptopBuildApi } from './laptop-build-api'
import { Part } from './part'

interface PartChange {
  part: Part
  isAdded: boolean
}

interface BuildState {
  buildKey: string
  parts: Part[]
  pendingSaves: number
  hasSaveError: boolean
}

@Injectable()
export class LateReadBuildStore {
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
    this.queueSave({ part, isAdded: true })
  }

  removePart(part: Part) {
    this.queueSave({ part, isAdded: false })
  }

  private queueSave(change: PartChange) {
    patchState(this.state, ({ pendingSaves }) => ({ pendingSaves: pendingSaves + 1 }))
    this.savePart(change)
  }

  private savePart$(change: PartChange) {
    // Read when concatMap reaches this change, not at the click.
    const buildKey = this.buildKey()

    return this.api.savePart(change).pipe(
      tapResponse({
        next: (parts) => {
          if (this.buildKey() === buildKey) {
            patchState(this.state, { parts })
          }
        },
        error: () => patchState(this.state, { hasSaveError: true }),
        finalize: () => this.finishSave(),
      }),
    )
  }

  private finishSave() {
    patchState(this.state, ({ pendingSaves }) => ({ pendingSaves: pendingSaves - 1 }))
  }
}
