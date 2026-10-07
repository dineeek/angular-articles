import { Type } from '@angular/core'
import { TestBedColumn, renderAndClick } from '../src/testing/testbed-columns'

function firstLines(messages: string[]): string {
  return messages.map((message) => message.split('\n')[0]).join(' / ')
}

export async function expectCleanRender(
  component: Type<unknown>,
  column: TestBedColumn,
): Promise<void> {
  const report = await renderAndClick(component, column)

  expect(report.uncaughtErrors, `uncaught: ${firstLines(report.uncaughtErrors)}`).toEqual([])

  if (column === 'dev-mode-render') {
    expect(report.consoleErrors, `console.error: ${firstLines(report.consoleErrors)}`).toEqual([])
  }
}
