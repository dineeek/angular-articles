import { Component, computed, signal } from '@angular/core'
import { Book, SAMPLE_BOOKS } from '../shared/book'
import { BookRow } from '../shared/book-row'

@Component({
  selector: 'app-book-shelf',
  imports: [BookRow],
  template: `
    <ul>
      @for (book of books(); track book.id) {
        <li>
          <app-book-row
            [book]="book"
            [showPrice]="true"
            [canArchive]="canArchive()"
            (archived)="loadBooks()"
            (removed)="removeBook($event)"
          />
        </li>
      }
    </ul>
  `,
})
export class BookShelf {
  readonly books = signal<Book[]>(SAMPLE_BOOKS)
  readonly role = signal<'admin' | 'clerk'>('admin')
  readonly canArchive = computed(() => this.role() === 'admin')

  loadBooks() {
    this.books.set(SAMPLE_BOOKS)
  }

  removeBook(book: Book) {
    this.books.update((books) => books.filter((item) => item.id !== book.id))
  }
}
