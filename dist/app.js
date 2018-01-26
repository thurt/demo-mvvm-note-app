/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const ViewModel = __webpack_require__(1);
const Note_1 = __webpack_require__(4);
const Toolbar_1 = __webpack_require__(7);
const Detail_1 = __webpack_require__(8);
const List_1 = __webpack_require__(9);
const MyViewModel = ViewModel(true);
const model_name = Note_1.default(MyViewModel);
let toolbar_name = 'toolbar_';
let detail_name = 'detail_';
Toolbar_1.default(toolbar_name, model_name, MyViewModel);
Detail_1.default(detail_name, model_name, MyViewModel);
List_1.default(toolbar_name, detail_name, model_name, MyViewModel);


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const EventRouter = __webpack_require__(2)

module.exports = function ViewModel(shouldLogEvents) {
  const R = EventRouter(shouldLogEvents) // router
  const M = {} // models

  // closure over model key
  const modelInstance = (_key) => {
    return {
      // The name of this model
      name: _key,
      // Emit an event on this model
      emit(name, data) {
        R.emit(_key, name, data)
      }
    }
  }

  return Object.freeze({
    // Create a new model
    create(key, extend_members) {
      let model = M[key]
      if (model !== undefined) return false

      model = M[key] = Object.create(null)
      model.instance = modelInstance(key)
      model.listeners = new WeakMap() // for mapping listener to it's model-bound copy
      Object.freeze(Object.assign(model.instance, extend_members))

      return true
    },
    // Run a function inside of a model
    run(key, funcToRun, ...args) {
      const model = M[key]
      if (model === undefined) return false

      funcToRun.apply(model.instance, args)
      return true
    },
    // Check if a model exists
    exists(key) {
      if (M[key] === undefined) return false
      return true
    },
    // Delete an existing model and all event listeners of that model
    destroy(key) {
      if (M[key] === undefined) return false

      R.purge(key)
      delete M[key]

      return true
    },
    // Add event listeners to this model
    add(key, methods) {
      const results = {}
      const model = M[key]
      if (model === undefined) return false

      for (let name in methods) {
        let method = methods[name]
        let boundMethod
        if (typeof method !== 'function') {
          results[name] = false
          continue
        }
        if (model.listeners.has(method)) {
          boundMethod = model.listeners.get(method)
        } else {
          boundMethod = method.bind(model.instance)
          model.listeners.set(method, boundMethod)
        }
        results[name] = R.add(key, name, boundMethod)
      }

      return results
    },
      // Remove event listeners from this model
    remove(key, methods) {
        const results = {}
        const model = M[key]
        if (model === undefined) return false

        for (let name in methods) {
          let method = methods[name]

          if (typeof method !== 'function') {
            results[name] = false
            continue
          }
          if (model.listeners.has(method)) {
            results[name] = R.remove(key, name, model.listeners.get(method))
          }
        }

        return results
      },
    getModelNames() {
      return Object.keys(M)
    }
  })
}

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const copyObjectGraph = __webpack_require__(3)
const myName = 'EventRouter'

function EventRouter(shouldLogCalls) {
  const events = Object.create(null)

  var public_interface = {
    getEvents() {
      return copyObjectGraph(events)
    },

    add(type, key, callback) {
      return _add(type, key, callback, events)
    },

    remove(type, key, callback) {
      return _remove(type, key, callback, events)
    },

    emit(type, key, data) {
      return _emit(type, key, data, events)
    },

    purge(type) {
      return _purge(type, events)
    }
  }

  if (shouldLogCalls) { // add logging proxy
    for (let method_name in public_interface) {
      public_interface[method_name] = closure(method_name, public_interface[method_name])
    }
    console.info(myName, 'is logging calls')
  }
  function closure(method_name, method) {
    return function(...args) {
      console.info(myName, method_name, args[0], args[1])
      return method.apply(null, args)
    }
  }

  return Object.freeze(public_interface)
}

module.exports = EventRouter
/////////////////////////////////////////////////////
/*
  t = type
  k = key
  d = data
  o = object
  cb = callback
*/
function _purge(t, o) {
  delete o[t]
}
function _emit(t, k, d, o) {
  var ot = o[t]
  if (ot === undefined) {
    console.warn(myName, 'event type', t, k, 'was just fired but there are no registered callbacks')
    return false
  }
  var otk = ot[k]
  if (otk === undefined) {
    console.warn(myName, 'event type', t, k, 'was just fired but there are no registered callbacks')
    return false
  }

  for (let cb of otk) cb(d)

  return true
}
function _add(t, k, cb, o) {
  var ot = o[t]
  if (ot === undefined) ot = o[t] = {}

  var otk = ot[k]
  if (otk === undefined) otk = ot[k] = []

  if (otk.includes(cb)) {
    console.warn(myName, 'event type', t, k, 'already has this callback function')
    return false
  }
  else otk.push(cb)

  return true
}
function _remove(t, k, cb, o) {
  var ot = o[t]
  if (ot === undefined) {
    console.warn(myName, 'cannot find type', t)
    return false
  }
  var otk = ot[k]
  if (otk === undefined) {
    console.warn(myName, 'cannot find key', k, 'in type', t)
    return false
  }
  if (!otk.includes(cb)) {
    console.warn(myName, 'cannot find this callback function under key', k, 'in type', t)
    return false
  }

  otk.splice(otk.indexOf(cb), 1)

  if (!otk.length) {
    delete ot[k]
    if (!Object.keys(ot).length) delete o[t]
  }

  return true
}

/***/ }),
/* 3 */
/***/ (function(module, exports) {

/*
 Copy Object Graphs
  Source: https://github.com/thurt/copy-object-graph
  Supports: nested/self-referencing objects, nested/self-referencing arrays, numbers, strings, null undefined
*/
function copyObjectGraph(obj) {
  if (typeof WeakMap !== 'function') throw new ReferenceError('copyObjectGraph requires WeakMap')

  var _pool = new WeakMap()
  return cpObj(obj)

  function cpObj(obj) {
    var cp
    if (typeof obj !== 'object') return obj
    if (obj === null) return null
    if (_pool.has(obj)) return _pool.get(obj) // for self-references

    if (Array.isArray(obj)) cp = obj.slice()
    else cp = Object.assign({}, obj)

    _pool.set(obj, cp)
    return cpProps(cp)
  }
  function cpProps(cp) {
    for (var prop in cp) cp[prop] = cpObj(cp[prop])
    return cp
  }
}

module.exports = copyObjectGraph

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const store = __webpack_require__(5);
const generateUUID = __webpack_require__(6);
const STORE = store('localStorage');
function Note(app) {
    const myName = 'Note';
    const NOTES = {};
    {
        const _NOTES = STORE.getAll();
        for (let key in _NOTES)
            NOTES[key] = JSON.parse(_NOTES[key]);
    }
    const blank = {
        title: '',
        body: '',
        created: null,
        modified: null,
    };
    app.create(myName, {
        new() {
            const key = generateUUID();
            blank.created = blank.modified = new Date().toString();
            STORE.set(key, blank);
            NOTES[key] = Object.assign({}, blank);
            this.emit('new', key);
        },
        get(key, prop) {
            const nk = NOTES[key];
            if (nk === undefined)
                return console.warn(this.name, 'key', key, 'does not exist');
            const nkp = nk[prop];
            if (nkp === undefined)
                return console.warn(this.name, 'property', prop, 'for key', key, 'does not exist');
            if (typeof nkp === 'object' && nkp !== null)
                return console.warn(this.name, 'property', prop, 'for key', key, 'is an object. Only primitives can be accessed.');
            return nkp;
        },
        getKeys() {
            return Object.keys(NOTES);
        },
        update(key, obj) {
            let changed = false;
            const nk = NOTES[key];
            if (nk === undefined)
                return console.warn(this.name, 'key', key, 'does not exist');
            for (let prop in obj) {
                let nkp = nk[prop];
                if (nkp === undefined) {
                    console.warn(this.name, 'property', prop, 'for key', key, 'does not exist');
                    continue;
                }
                if (nkp !== obj[prop]) {
                    nk[prop] = obj[prop];
                    this.emit('update_' + prop, key);
                    changed = true;
                }
            }
            if (changed) {
                NOTES[key].modified = Date().toString();
                this.emit('update_modified', key);
                STORE.set(key, NOTES[key]);
            }
        },
        delete(key) {
            delete NOTES[key];
            STORE.remove(key);
            this.emit('delete', key);
        },
    });
    return myName;
}
exports.default = Note;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function StorageManager(type) {
  if (type !== 'localStorage' && type !== 'sessionStorage') throw new ReferenceError(`StorageManager does not support storage type ${type}`)

  const myStore = window[type]

  return {
    get(key) {
      var item = myStore.getItem(key)
      if (item !== null) return item
      return false
    },
    getAll() {
      var key = ''
      var map = {}
      var item = null
      for (var i = 0; i < myStore.length; i++) {
        key = myStore.key(i)
        if (~key.indexOf('_')) continue
        item = myStore.getItem(key)
        map[key] = item
      }
      return map
    },
    set(key, obj) {
      try {
        var data
        if (typeof obj !== 'string') data = JSON.stringify(obj)
        else data = obj

        myStore.setItem(key, data)
        return true
      }
      catch(e) {
        console.error(e)
        return false
      }
    },
    remove(key) {
      var item = myStore.getItem(key)
      if (item === null) return false
      myStore.removeItem(key)
      return true
    },
    length() {
      return myStore.length
    },
    clear() {
      myStore.clear()
    }
  }
}

module.exports = StorageManager

/***/ }),
/* 6 */
/***/ (function(module, exports) {

// Source: http://stackoverflow.com/a/8809472
module.exports = function() {
  var d = new Date().getTime()
  if (window.performance && typeof window.performance.now === "function") {
    d += window.performance.now() //use high-precision timer if available
  }
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
  return uuid
}

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function Toolbar(myName, myModel, app) {
    const myView = document.getElementById('Toolbar');
    const myData = Object.create(null);
    // fill myData
    for (let i = 0, els = myView.querySelectorAll('[data-name]'); i < els.length; i++) {
        myData[els[i].dataset.name] = els[i];
    }
    function click(e) {
        e.stopPropagation();
        app.run(myModel, _click, e.target);
    }
    function _click(target) {
        const name = target.dataset.name;
        if (name !== 'delete')
            return this.emit(myName + name);
        if (window.confirm(`Are you sure you want to delete this ${myModel} ?`)) {
            this.emit(myName + name);
        }
    }
    myView.addEventListener('click', click, true);
    app.add(myModel, {
        [myName + 'disableButton'](btn_name) {
            const btn = myData[btn_name];
            if (btn !== undefined)
                btn.disabled = true;
            else
                console.warn('Cannot find button by name', btn_name);
        },
        [myName + 'enableButton'](btn_name) {
            const btn = myData[btn_name];
            if (btn !== undefined)
                btn.disabled = false;
            else
                console.warn('Cannot find button by name', btn_name);
        },
    });
}
exports.default = Toolbar;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function Detail(myName, myModel, app) {
    const myView = document.getElementById('Detail');
    const myData = Object.create(null);
    const myEmpty = document.getElementById('Empty');
    // fill myData
    for (let i = 0, els = myView.querySelectorAll('[data-name]'); i < els.length; i++) {
        let e = els[i];
        myData[e.dataset.name] = e;
    }
    let myKey = null;
    function input(e) {
        e.stopPropagation();
        app.run(myModel, _input, e.target);
    }
    function _input(target) {
        switch (target.dataset.name) {
            case 'title':
                this.update(myKey, { [target.dataset.name]: target.innerText });
                break;
            case 'body':
                this.update(myKey, { [target.dataset.name]: target.innerHTML });
                break;
            default:
                console.warn(myName, ': this view-model does not recognize dataset name', target.dataset.name);
                break;
        }
    }
    myView.addEventListener('input', input, true);
    myData['title'].addEventListener('keydown', function (e) {
        if (e.keyCode === 13) {
            // enter
            e.preventDefault();
        }
    });
    function clearSelections() {
        Object.keys(myData).forEach(key => myData[key].blur());
        window.getSelection().removeAllRanges();
    }
    app.add(myModel, {
        update_modified(key) {
            if (myKey !== key)
                return;
            myData['modified'].textContent =
                'Modified: ' + this.get(myKey, 'modified');
        },
        [myName + 'set'](key) {
            clearSelections();
            myKey = key;
            for (let name in myData) {
                let value = this.get(myKey, name);
                if (name === 'created' || name === 'modified') {
                    value = name.charAt(0).toUpperCase() + name.slice(1) + ': ' + value;
                }
                myData[name].innerHTML = value;
            }
            if (myView.classList.contains('hidden')) {
                myView.classList.remove('hidden');
                myEmpty.classList.add('hidden');
            }
        },
        [myName + 'clear']() {
            if (myView.classList.contains('hidden'))
                return;
            myView.classList.add('hidden');
            myEmpty.classList.remove('hidden');
            myKey = null;
            clearSelections();
        },
    });
}
exports.default = Detail;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function List(myToolbar, myDetail, myModel, app) {
    const myView = document.getElementById('List');
    const myKeys = new WeakMap();
    let open_el = null;
    let auto_open = false;
    function click(e) {
        e.stopPropagation();
        app.run(myModel, _click, e.target);
    }
    function _click(target) {
        if (!open(target))
            return;
        this.emit(myToolbar + 'enableButton', 'delete');
        this.emit(myDetail + 'set', myKeys.get(open_el));
    }
    function open(target) {
        if (open_el) {
            if (open_el === target)
                return false; // target is already open
            open_el.classList.remove('active');
        }
        open_el = target;
        open_el.classList.add('active');
        return true; // opened target
    }
    function checkForEmptyTitle(title) {
        if (title === '') {
            return '<Untitled>';
        }
        else {
            return title;
        }
    }
    myView.addEventListener('click', click, true);
    app.add(myModel, {
        new(key) {
            const title = checkForEmptyTitle(this.get(key, 'title'));
            const btn = document.createElement('button');
            btn.textContent = title;
            btn.setAttribute('title', title);
            btn.classList.add('btn');
            btn.classList.add('btn-default');
            myKeys.set(btn, key);
            myView.insertBefore(btn, myView.childNodes[0]);
            if (auto_open) {
                auto_open = false;
                _click.call(this, btn);
            }
        },
        update_title(key) {
            const title = checkForEmptyTitle(this.get(key, 'title'));
            open_el.innerText = title;
            open_el.setAttribute('title', title);
        },
        delete(key) {
            const next_sibling = open_el.nextElementSibling;
            open_el.remove();
            open_el = null;
            if (next_sibling === null) {
                this.emit(myToolbar + 'disableButton', 'delete');
                this.emit(myDetail + 'clear');
            }
            else {
                app.run(myModel, _click, next_sibling);
            }
        },
        [myToolbar + 'delete']() {
            this.delete(myKeys.get(open_el));
        },
        [myToolbar + 'new']() {
            auto_open = true;
            this.new();
        },
    });
    // Fill List with existing items
    app.run(myModel, function () {
        this.getKeys()
            .sort((a, b) => {
            // sort by created date descending
            const a_created = Date.parse(this.get(a, 'created'));
            const b_created = Date.parse(this.get(b, 'created'));
            return a_created > b_created;
        })
            .forEach((key) => this.emit('new', key));
    });
}
exports.default = List;


/***/ })
/******/ ]);
//# sourceMappingURL=app.js.map