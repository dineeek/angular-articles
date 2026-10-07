import { Component, Input } from '@angular/core'
import { Book } from '../shared/book'

@Component({
  selector: 'app-book-actions',
  templateUrl: './book-actions.html',
})
export class BookActions {
  @Input({ required: true }) book!: Book
  @Input() canEdit = false
}
