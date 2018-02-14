import * as api from 'cms-client-api';
import ndjsonStream = require('can-ndjson-stream'); // This file should be imported using the CommonJS-style

export const basePath = '/api';
export const posts = new api.PostsApi(window.fetch, basePath);
export const auth = new api.AuthApi(window.fetch, basePath);

type chunk = {
  done: boolean;
  value: any;
};

export async function streamRequest(
  path: string,
  cb: (value: any) => void,
  options?: any,
) {
  const r = await fetch(path, options);
  if (!r.ok) {
    throw r;
  }

  const reader = ndjsonStream(r.body).getReader();

  let c: chunk;
  while (true) {
    c = await reader.read();
    if (c.done) {
      break;
    }
    cb(c.value);
  }
}
