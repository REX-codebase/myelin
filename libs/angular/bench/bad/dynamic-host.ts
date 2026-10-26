import { ChangeDetectorRef, Component, ComponentFactoryResolver, ViewContainerRef, inject } from '@angular/core';
import { ToastComponent } from './toast.component';

@Component({ selector: 'app-host', template: '' })
export class HostComponent {
  private vcr = inject(ViewContainerRef);
  private resolver = inject(ComponentFactoryResolver);
  private cdr = inject(ChangeDetectorRef);

  showToast() {
    const factory = this.resolver.resolveComponentFactory(ToastComponent);
    this.vcr.createComponent(factory);
    this.cdr.checkNoChanges();
  }
}
