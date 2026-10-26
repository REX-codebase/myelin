import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private http = inject(HttpClient);

  upload(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post('/api/upload', body, { reportProgress: true, observe: 'events' });
  }

  ping() {
    return this.http.jsonp<{ ok: boolean }>('https://example.com/ping', 'callback');
  }
}
