# angular-articles

Runnable examples for my articles on Angular, published on [Medium](https://medium.com/@dineeek).
Each folder belongs to one article and holds the code the article shows, plus the checks it describes.

All code here is invented for the articles. Names, domains and data are made up.

## Articles

| Folder | Article |
|-|-|
| [`01-template-check-matrix`](01-template-check-matrix) | [Which check catches which Angular template bug? I tested eight](https://medium.com/@dineeek/which-check-catches-which-angular-template-bug-i-tested-eight-32b7092272df) |
| [`03-rxjs-traps`](03-rxjs-traps) | When concatMap reads your state later than you think (publishes 1 Dec 2026) |
| [`07-call-state-feature`](07-call-state-feature) | [I put request data inside the union. signalStore changed my mind](https://medium.com/@dineeek/i-put-request-data-inside-the-union-signalstore-changed-my-mind-2d7192d66894) |
| [`11-lost-in-the-merge`](11-lost-in-the-merge) | How one merge deleted shipped features and every check stayed green (publishes 24 Nov 2026) |
| [`19-split-store-features`](19-split-store-features) | [Three ways to split a signalStore across files. Two of them fail in the compiler or the linter](https://medium.com/@dineeek/three-ways-to-split-a-signalstore-across-files-adadfc89a376) |

## Run it

Angular 22.2, TypeScript 6.0, pnpm.

```bash
pnpm install
pnpm ng test template-check-matrix --watch=false
pnpm ng build call-state
pnpm ng lint lost-in-the-merge
```

Each folder has its own README with the steps for that article.
