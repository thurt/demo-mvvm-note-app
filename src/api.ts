import * as api from 'cms-client-api';
import ndjsonStream = require('can-ndjson-stream'); // This file should be imported using the CommonJS-style

export const basePath = '/api';
export const posts = new api.PostsApi(undefined, basePath);
export const auth = new api.AuthApi(undefined, basePath);

export type UnaryError = {
  error: string;
  code: number;
};

export type StreamError = {
  error: {
    grpc_code: number;
    http_code: number;
    message: string;
    http_status: string;
  };
};

// Error is the interface returned by the api in the response body when a request error has occurred. Common examples of request errors that would cause the server to respond with an Error would be when the the request contains invalid or missing values, or when a request is made for a non-existant entity.
export type Error = UnaryError | StreamError;

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
