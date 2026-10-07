export interface Book {
  id: number
  title: string
  price: number
  isOwner: boolean
  isSharedWithMe: boolean
}

export const SAMPLE_BOOKS: Book[] = [
  { id: 1, title: 'The Quiet Merge', price: 18, isOwner: true, isSharedWithMe: false },
  { id: 2, title: 'Signals at Dawn', price: 24, isOwner: false, isSharedWithMe: true },
  { id: 3, title: 'A Branch Too Long', price: 15, isOwner: false, isSharedWithMe: false },
]
