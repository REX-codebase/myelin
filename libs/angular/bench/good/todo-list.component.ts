import { Component, input, output } from '@angular/core';

export interface Todo {
  id: number;
  title: string;
  done: boolean;
}

@Component({
  selector: 'app-todo-list',
  template: `
    @switch (status()) {
      @case ('loading') { <p>Loading...</p> }
      @case ('error') { <p>Could not load the list.</p> }
      @default {
        @for (todo of todos(); track todo.id) {
          <li [class.done]="todo.done" (click)="toggle.emit(todo.id)">{{ todo.title }}</li>
        } @empty {
          <li>Nothing to do.</li>
        }
      }
    }
  `,
})
export class TodoListComponent {
  todos = input<Todo[]>([]);
  status = input<'ready' | 'loading' | 'error'>('ready');
  toggle = output<number>();
}
