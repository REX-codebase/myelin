import { Component, ElementRef, input, model, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-stepper',
  template: `
    <button #minus (click)="value.set(value() - step())">-</button>
    <span>{{ value() }}</span>
    <button (click)="value.set(value() + step())">+</button>
  `,
})
export class StepperComponent {
  step = input(1);
  value = model(0);
  minus = viewChild<ElementRef<HTMLButtonElement>>('minus');
  cleared = output<void>();

  reset() {
    this.value.set(0);
    this.cleared.emit();
  }
}
