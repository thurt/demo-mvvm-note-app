import * as Store from 'storage-manager';
import generateUUID = require('../lib/generateUUID');
import ViewModel = require('view-model');
import {auth, posts, basePath, streamRequest} from '../api';
import {CmsPost, CmsAccessToken, CmsUser} from 'cms-client-api';

const STORE = Store('localStorage');

interface State {
  isSetup: boolean;
  authUser: CmsAccessToken & CmsUser;
}

type PostChunk = {result: CmsPost};

function convert(prop: string): string {
  switch (prop) {
    case 'modified':
      return 'last_edited';
    case 'body':
      return 'content';
    default:
      return prop;
  }
}
export default async function Note(app: ViewModel.Interface): Promise<string> {
  const myName = 'Post';
  const POSTS: {[id: string]: CmsPost} = {};

  app.create(myName, {
    async new() {
      try {
        const pid = await posts.createPost({body: {}});
        this.emit('new', pid);
      } catch (e) {
        console.error(e);
      }
    },
    get(key, prop) {
      const nk = POSTS[key];
      if (nk === undefined)
        return console.warn(this.name, 'key', key, 'does not exist');
      const cp = convert(prop);
      //@ts-ignore
      const nkp = nk[cp];
      if (nkp === undefined)
        return console.warn(
          this.name,
          'property',
          prop,
          'for key',
          key,
          'does not exist',
        );
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
    async update(id, obj) {
      let changed = false;
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
          //@ts-ignore
          p[cp] = obj[prop];
          this.emit('update_' + prop, id);
          changed = true;
        }
      }
      if (changed) {
        try {
          await posts.updatePost({id, body: p});
          const pu = await posts.getPost({id});
          POSTS[id].last_edited = pu.last_edited;
          this.emit('update_modified', id);
        } catch (e) {
          console.error(e);
        }
      }
    },
    async delete(id) {
      try {
        const pid = await posts.deletePost({id});
        delete POSTS[id];
        this.emit('delete', id);
      } catch (e) {
        console.error(e);
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
    const access_token = s.authUser && s.authUser.access_token;
    if (!access_token) {
      throw 'state.authUser.access_token must exist';
    }
    await streamRequest(
      basePath + '/posts',
      (pc: PostChunk) => {
        const p = pc.result;
        POSTS[p.id] = p;
      },
      {
        headers: new Headers({
          Authorization: `Bearer ${access_token}`,
        }),
      },
    );
  } catch (e) {
    console.error(e);
  }

  return myName;
}