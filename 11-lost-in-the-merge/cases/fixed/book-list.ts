import { Component, signal } from '@angular/core'
import { Book, SAMPLE_BOOKS } from '../shared/book'

@Component({
  selector: 'app-book-list',
  template: `
    <button type="button" (click)="reload()">Reload</button>
    <ul>
      @for (book of books(); track book.id) {
        <li>
          {{ book.title }}
          <button type="button" (click)="deleteBook(book)">Remove</button>
        </li>
      }
    </ul>
  `,
})
export class BookList {
  readonly books = signal<Book[]>(SAMPLE_BOOKS)

  reload() {
    this.books.set(SAMPLE_BOOKS)
  }

  deleteBook(book: Book) {
    this.books.update((books) => books.filter((item) => item.id !== book.id))
  }
}
