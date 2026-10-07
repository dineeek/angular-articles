import { Component } from '@angular/core'
import { SAMPLE_BOOKS } from '../shared/book'
import { BookActions } from './book-actions'
import { BookList } from './book-list'
import { BookOptions } from './book-options'
import { BookShelf } from './book-shelf'

@Component({
  selector: 'app-bookshop-admin',
  imports: [BookActions, BookList, BookOptions, BookShelf],
  template: `
    <app-book-options />
    <app-book-list />
    <app-book-shelf />
    @for (book of books; track book.id) {
      <app-book-actions [book]="book" [canEdit]="true" />
    }
  `,
})
export class BookshopAdmin {
  protected readonly books = SAMPLE_BOOKS
}
