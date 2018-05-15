import * as Store from 'storage-manager';
import generateUUID = require('../lib/generateUUID');
import ViewModel = require('view-model');
import {auth, posts, basePath, streamRequest} from '../api';
import {
  CmsPost,
  CmsUpdatePostRequest,
  CmsAccessToken,
  CmsUser,
} from 'cms-client-api';
import debounce = require('debounce');

const STORE = Store('localStorage');

interface State {
  isSetup: boolean;
  authUser: CmsAccessToken & CmsUser;
}

type PostChunk = {result: CmsPost};

function convert(prop: string): string {
  switch (prop) {
    case 'modified':
      return 'lastEdited';
    case 'body':
      return 'content';
    default:
      return prop;
  }
}

function fillUndefined(p: CmsPost): void {
  if (p.title === undefined) {
    p.title = '';
  }
  if (p.content === undefined) {
    p.content = '';
  }
}

export default async function(
  app: ViewModel.Interface,
  errorHandler: (e: Error | Response) => void,
): Promise<string> {
  const myName = 'Post';
  const POSTS: {[id: string]: CmsPost} = {};
  let accessToken: string;

  const updatePost = debounce(
    function(id: number, p: CmsUpdatePostRequest, publishChanges: boolean) {
      app.run(myName, async function() {
        try {
          await posts.updateUnpublishedPost(
            {id, body: p},
            {headers: {Authorization: 'Bearer ' + accessToken}},
          );
          if (publishChanges) {
            await posts.updatePost(
              {id, body: p},
              {headers: {Authorization: 'Bearer ' + accessToken}},
            );
          }
          const pu = await posts.getUnpublishedPost(
            {id},
            {headers: {Authorization: 'Bearer ' + accessToken}},
          );
          POSTS[id].lastEdited = pu.lastEdited;
          this.emit('update_modified', id);
        } catch (e) {
          errorHandler(e);
        }
      });
    },
    3000,
    false,
  );

  app.create(myName, {
    async new() {
      try {
        const res = await posts.createPost(
          {body: {}},
          {headers: {Authorization: 'Bearer ' + accessToken}},
        );
        const p = await posts.getUnpublishedPost(
          {id: res.id},
          {headers: {Authorization: 'Bearer ' + accessToken}},
        );
        fillUndefined(p);
        POSTS[p.id] = p;
        this.emit('new', p.id);
      } catch (e) {
        errorHandler(e);
      }
    },
    get(key, prop) {
      const nk = POSTS[key];
      if (nk === undefined)
        return console.warn(this.name, 'key', key, 'does not exist');
      const cp = convert(prop);
      //@ts-ignore
      const nkp = nk[cp];
      if (nkp === undefined) {
        return console.warn(
          this.name,
          'property',
          cp,
          'for key',
          key,
          'does not exist',
        );
      }
      if (typeof nkp === 'object' && nkp !== null)
        return console.warn(
          this.name,
          'property',
          prop,
          'for key',
          key,
          'is an object. Only primitives can be accessed.',
        );

      return nkp;
    },
    getKeys() {
      return Object.keys(POSTS);
    },
    update(id: number, obj: {[p: string]: any}) {
      let changed = false;
      let publishChanges = false;
      const p = POSTS[id];
      if (p === undefined)
        return console.warn(this.name, 'id', id, 'does not exist');
      for (let prop in obj) {
        const cp = convert(prop);
        //@ts-ignore
        let pp = p[cp];
        if (pp === undefined) {
          console.warn(
            this.name,
            'property',
            prop,
            'for id',
            id,
            'does not exist',
          );
          continue;
        }
        if (pp !== obj[prop]) {
          if (prop === 'lastPublished') {
            publishChanges = true;
          } else {
            //@ts-ignore
            p[cp] = obj[prop];
            this.emit('update_' + prop, id);
          }
          changed = true;
        }
      }
      if (changed) {
        updatePost(id, p, publishChanges);
      }
    },
    async delete(id) {
      try {
        await posts.deletePost(
          {id},
          {headers: {Authorization: 'Bearer ' + accessToken}},
        );
        delete POSTS[id];
        this.emit('delete', id);
      } catch (e) {
        errorHandler(e);
      }
    },
  });

  try {
    let s: State;
    const v = STORE.get('state');
    if (v !== false) {
      s = JSON.parse(v);
    } else {
      throw "STORE.get('state') must exist";
    }
    accessToken = s.authUser && s.authUser.accessToken;
    if (!accessToken) {
      throw 'state.authUser.accessToken must exist';
    }
    await streamRequest(
      basePath + '/unpublished-posts',
      (pc: PostChunk) => {
        const p = pc.result;
        fillUndefined(p);
        POSTS[p.id] = p;
      },
      {headers: {Authorization: 'Bearer ' + accessToken}},
    );
  } catch (e) {
    errorHandler(e);
  }

  return myName;
}
