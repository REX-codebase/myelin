import { HttpClient, HttpEventType } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Todo } from './todo-list.component';

@Service()
export class TodoStore {
  private readonly http = inject(HttpClient);

  load() {
    return this.http.get<Todo[]>('/api/todos');
  }

  upload(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post('/api/todos/import', body, {
      reportUploadProgress: true,
      observe: 'events',
    });
  }

  isProgress(event: { type: HttpEventType }) {
    return event.type === HttpEventType.UploadProgress;
  }
}
