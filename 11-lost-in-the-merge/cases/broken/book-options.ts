import { Component, OnInit, signal } from '@angular/core'

@Component({
  selector: 'app-book-options',
  templateUrl: './book-options.html',
})
export class BookOptions implements OnInit {
  readonly loadingOptions = signal(true)
  readonly options = signal<string[]>([])

  ngOnInit() {
    this.load()
  }

  load() {
    this.loadingOptions.set(true)
    queueMicrotask(() => {
      this.options.set(['Hardcover', 'Paperback', 'E-book'])
      this.loadingOptions.set(false)
    })
  }
}
