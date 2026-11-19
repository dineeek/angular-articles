import { createRequire } from 'node:module'
import {
  Subject,
  catchError,
  concatMap,
  config,
  defer,
  forkJoin,
  map,
  of,
  ReplaySubject,
  share,
  shareReplay,
  throwError,
} from 'rxjs'

const require = createRequire(import.meta.url)

console.log(`rxjs ${require('rxjs/package.json').version}`)

console.log('--- 1. concatMap reads state when it dequeues')
let shelf = 'fiction'
const clicks = new Subject()
const pending = []

clicks
  .pipe(
    concatMap((title) => {
      const shelfAtSend = shelf
      const save = new Subject()

      pending.push(save)

      return save.pipe(map(() => `${title} saved with shelf=${shelfAtSend}`))
    }),
  )
  .subscribe(console.log)
clicks.next('Dune')
clicks.next('Emma')
shelf = 'classics'
pending[0].next()
pending[0].complete()
pending[1].next()
pending[1].complete()

console.log('--- 1b. same code with a synchronous of() mock')
shelf = 'fiction'
const clicks2 = new Subject()

clicks2
  .pipe(
    concatMap((title) => {
      const shelfAtSend = shelf

      return of(`${title} saved with shelf=${shelfAtSend}`)
    }),
  )
  .subscribe(console.log)
clicks2.next('Dune')
clicks2.next('Emma')
shelf = 'classics'

console.log('--- 2. catchError(() => []) inside forkJoin')
const logJoin = {
  next: (value) => console.log('next', JSON.stringify(value)),
  complete: () => console.log('complete'),
}

forkJoin([of(['Dune']), throwError(() => new Error('500')).pipe(catchError(() => []))]).subscribe(
  logJoin,
)
forkJoin([
  of(['Dune']),
  throwError(() => new Error('500')).pipe(catchError(() => of([]))),
]).subscribe(logJoin)

console.log('--- 3. forkJoin({}) and forkJoin([])')
forkJoin({}).subscribe({
  next: (value) => console.log('next', value),
  complete: () => console.log('complete {}'),
})
forkJoin([]).subscribe({
  next: (value) => console.log('next', value),
  complete: () => console.log('complete []'),
})

console.log('--- 4. shareReplay(1) after an error')
let calls = 0
const genres$ = defer(() => {
  calls++

  return calls === 1 ? throwError(() => new Error('first call fails')) : of(['poetry'])
}).pipe(shareReplay(1))

genres$.subscribe({
  next: (value) => console.log('sub A next', value),
  error: (error) => console.log('sub A error', error.message),
})
genres$.subscribe({
  next: (value) => console.log('sub B next', value),
  error: (error) => console.log('sub B error', error.message),
})
console.log('source calls', calls)

console.log('--- 4b. share with resetOnError: false after an error')
let sharedCalls = 0
const poets$ = defer(() => {
  sharedCalls++

  return sharedCalls === 1 ? throwError(() => new Error('first call fails')) : of(['Rilke'])
}).pipe(
  share({
    connector: () => new ReplaySubject(1),
    resetOnError: false,
    resetOnComplete: false,
    resetOnRefCountZero: false,
  }),
)

poets$.subscribe({
  next: (value) => console.log('sub A next', value),
  error: (error) => console.log('sub A error', error.message),
})
poets$.subscribe({
  next: (value) => console.log('sub B next', value),
  error: (error) => console.log('sub B error', error.message),
})
console.log('source calls', sharedCalls)

console.log('--- 5. a throw inside subscribe next')
const cart = new Subject()

cart.subscribe(() => {
  throw new Error('subscriber A failed')
})
cart.subscribe((value) => console.log('subscriber B got', value))

try {
  cart.next(1)
  console.log('caller: next() returned normally')
} catch (error) {
  console.log('caller caught', error.message)
}

process.on('uncaughtException', (error) => console.log('later, on a timer:', error.message))

// Case 5b must run after the timer that case 5 queued, or its lines print before case 5 ends.
setTimeout(() => {
  console.log('--- 5b. the same throw with useDeprecatedSynchronousErrorHandling')
  config.useDeprecatedSynchronousErrorHandling = true

  try {
    const deprecatedCart = new Subject()

    deprecatedCart.subscribe(() => {
      throw new Error('subscriber A failed')
    })
    deprecatedCart.subscribe((value) => console.log('subscriber B got', value))

    try {
      deprecatedCart.next(1)
      console.log('caller: next() returned normally')
    } catch (error) {
      console.log('caller caught', error.message)
    }
  } finally {
    config.useDeprecatedSynchronousErrorHandling = false
  }

  console.log('config reset:', config.useDeprecatedSynchronousErrorHandling)
})
