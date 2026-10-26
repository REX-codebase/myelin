import { Component } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-fade',
  template: `@if (show) { <div @fade>Hello</div> }`,
  animations: [
    trigger('fade', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms', style({ opacity: 1 }))]),
    ]),
  ],
})
export class FadeComponent {
  show = true;
}
