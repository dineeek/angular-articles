# angular-articles

Runnable examples for my articles on Angular, published on [Medium](https://medium.com/@dineeek).
Each folder belongs to one article and holds the code the article shows, plus the checks it describes.

All code here is invented for the articles. Names, domains and data are made up.

## Articles

| Folder | Article |
|-|-|
| [`01-template-check-matrix`](01-template-check-matrix) | Which check catches which Angular template bug? I tested eight (coming soon) |
| [`07-call-state-feature`](07-call-state-feature) | I put request data inside the union. signalStore changed my mind (coming soon) |
| [`11-lost-in-the-merge`](11-lost-in-the-merge) | How one merge deleted shipped features and every check stayed green (coming soon) |

## Run it

Angular 22.2, TypeScript 6.0, pnpm.

```bash
pnpm install
pnpm ng test template-check-matrix --watch=false
pnpm ng build call-state
pnpm ng lint lost-in-the-merge
```

Each folder has its own README with the steps for that article.
