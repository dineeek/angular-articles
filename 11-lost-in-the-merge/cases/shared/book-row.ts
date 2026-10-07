import { Component, input, output } from '@angular/core'
import { Book } from './book'

@Component({
  selector: 'app-book-row',
  template: `
    <span>{{ book().title }}</span>
    @if (showPrice()) {
      <span>{{ book().price }}</span>
    }
    @if (canArchive()) {
      <button type="button" (click)="archived.emit(book())">Archive</button>
    }
    <button type="button" (click)="removed.emit(book())">Remove</button>
  `,
})
export class BookRow {
  readonly book = input.required<Book>()
  readonly showPrice = input(false)
  readonly canArchive = input(false)
  readonly archived = output<Book>()
  readonly removed = output<Book>()
}
