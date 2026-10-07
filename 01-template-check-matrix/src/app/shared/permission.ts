import {
  Directive,
  Injectable,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core'

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly granted = new Set(['recipe:edit', 'recipe:delete'])

  has(code: string): boolean {
    return this.granted.has(code)
  }
}

@Directive({ selector: '[appPermission]' })
export class PermissionDirective {
  readonly appPermission = input.required<string>()

  private readonly templateRef = inject(TemplateRef)
  private readonly viewContainer = inject(ViewContainerRef)
  private readonly permissions = inject(PermissionService)

  constructor() {
    effect(() => {
      this.viewContainer.clear()

      if (this.permissions.has(this.appPermission())) {
        this.viewContainer.createEmbeddedView(this.templateRef)
      }
    })
  }
}
