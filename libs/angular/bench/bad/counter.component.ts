import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-counter',
  moduleId: module.id,
  interpolation: ['{{', '}}'],
  template: `<button #btn (click)="bump()">{{ value }}</button>`,
})
export class CounterComponent {
  @Input() label = '';
  @Input() step = 1;
  @Output() reset = new EventEmitter<void>();
  @ViewChild('btn') button!: ElementRef<HTMLButtonElement>;
  value = 0;

  bump() {
    this.value += this.step;
  }
}
