import { NO_ERRORS_SCHEMA, Type } from '@angular/core'
import { TestBed } from '@angular/core/testing'

export const testBedColumns = ['no-errors-schema', 'error-on-unknown', 'dev-mode-render'] as const

export type TestBedColumn = (typeof testBedColumns)[number]

export interface RenderReport {
  uncaughtErrors: string[]
  consoleErrors: string[]
}

export async function renderAndClick(
  component: Type<unknown>,
  column: TestBedColumn,
): Promise<RenderReport> {
  const report: RenderReport = { uncaughtErrors: [], consoleErrors: [] }
  const originalConsoleError = console.error

  const recordUncaught = (event: ErrorEvent) => {
    event.preventDefault()
    report.uncaughtErrors.push(String(event.error ?? event.message))
  }

  console.error = (...args: unknown[]) => {
    report.consoleErrors.push(args.map(String).join(' '))
  }

  // jsdom reports an error thrown by a click listener on window, never to the caller of click().
  window.addEventListener('error', recordUncaught)

  try {
    if (column === 'no-errors-schema') {
      TestBed.overrideComponent(component, { add: { schemas: [NO_ERRORS_SCHEMA] } })
    } else {
      const isStrict = column === 'error-on-unknown'

      TestBed.configureTestingModule({
        errorOnUnknownElements: isStrict,
        errorOnUnknownProperties: isStrict,
      })
    }

    const fixture = TestBed.createComponent(component)

    await fixture.whenStable()

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button')

    for (const button of Array.from(buttons)) {
      button.click()
      await fixture.whenStable()
    }
  } finally {
    window.removeEventListener('error', recordUncaught)
    console.error = originalConsoleError
  }

  return report
}
