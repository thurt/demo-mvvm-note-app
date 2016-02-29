(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{}],2:[function(require,module,exports){
'use strict'
const copyObjectGraph = require('copy-object-graph')
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
},{"copy-object-graph":1}],3:[function(require,module,exports){
'use strict'
const EventRouter = require('event-router')

module.exports = function ViewModel(shouldLogEvents) {
  const M = {} // models
  var R // router

  if (shouldLogEvents) {
    R = EventRouter(true)
  } else {
    R = EventRouter(false)
  }

  // Get a list of all model names
  function ViewModel() {
    return Object.keys(M)
  }
  // Create a new model
  ViewModel.create = function(key, extend_members) {
    var model = M[key]
    if (model !== undefined) return false

    model = M[key] = Object.create(null)
    model.instance = modelInstance(key)
    model.listeners = new WeakMap() // for mapping listener to it's model-bound copy
    Object.freeze(Object.assign(model.instance, extend_members))

    return true
  }
  // Run a function inside of a model
  ViewModel.run = function(key, funcToRun, ...args) {
    var model = M[key]
    if (model === undefined) return false

    funcToRun.apply(model.instance, args)
    return true
  }
  // Check if a model exists
  ViewModel.exists = function(key) {
    if (M[key] === undefined) return false
    return true
  }
  // Delete an existing model and all event listeners of that model
  ViewModel.destroy = function(key) {
    if (M[key] === undefined) return false

    R.purge(key)
    delete M[key]

    return true
  }
  // Add event listeners to this model
  ViewModel.add = function(key, methods) {
    var results = {}
    var model = M[key]
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
  ViewModel.remove = function(key, methods) {
    var results = {}
    var model = M[key]
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
  }

  // closure over model key
  function modelInstance(_key) {
    return {
      // The name of this model
      name: _key,
      // Emit an event on this model
      emit(name, data) {
        R.emit(_key, name, data)
      }
    }
  }
  return ViewModel
}
},{"event-router":2}],4:[function(require,module,exports){
'use strict'
var app = require('view-model')(true)
module.exports = app

let toolbar_name = 'toolbar_'
let detail_name = 'detail_'
let model_name = require('./models/Note')()

require('./views/Toolbar')(toolbar_name, model_name)
require('./views/Detail')(detail_name, model_name)
require('./views/List')(toolbar_name, detail_name, model_name)
},{"./models/Note":6,"./views/Detail":7,"./views/List":8,"./views/Toolbar":9,"view-model":3}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
'use strict'
var app = require('../app')

module.exports = function() {
  const myName = 'Note'
  const STORE = require('storage-manager')('localStorage')
  const generateUUID = require('../lib/generateUUID')

  const NOTES = STORE.getAll()
  for (let key in NOTES) NOTES[key] = JSON.parse(NOTES[key])

  const blank = {
    title: 'New ' + myName,
    body: 'Enter some body text here',
    created: null,
    modified: null
  }

  app.create(myName, {
    new() {
      var key = generateUUID()
      blank.created = blank.modified = Date().toString()

      STORE.set(key, blank)
      NOTES[key] = Object.assign({}, blank)

      this.emit('new', key)
    },
    get(key, prop) {
      var nk = NOTES[key]
      if (nk === undefined) return console.warn(this.name, 'key', key, 'does not exist')
      var nkp = nk[prop]
      if (nkp === undefined) return console.warn(this.name, 'property', prop, 'for key', key, 'does not exist')
      if (typeof nkp === 'object' && nkp !== null) return console.warn(this.name, 'property', prop, 'for key', key, 'is an object. Only primitives can be accessed.')

      return nkp
    },
    getKeys() {
      return Object.keys(NOTES)
    },
    update(key, obj) {
      var changed = false
      var nk = NOTES[key]
      if (nk === undefined) return console.warn(this.name, 'key', key, 'does not exist')
      for (let prop in obj) {
        let nkp = nk[prop]
        if (nkp === undefined) {
          console.warn(this.name, 'property', prop, 'for key', key, 'does not exist')
          continue
        }
        if (nkp !== obj[prop]) {
          nk[prop] = obj[prop]
          this.emit('update_'+prop, key)
          changed = true
        }
      }
      if (changed) {
        NOTES[key].modified = Date().toString()
        this.emit('update_modified', key)
        STORE.set(key, NOTES[key])
      }
    },
    delete(key) {
      delete NOTES[key]
      STORE.remove(key)
      this.emit('delete', key)
    }
  })

  return myName
}

},{"../app":4,"../lib/generateUUID":5,"storage-manager":10}],7:[function(require,module,exports){
'use strict'
var app = require('../app')

module.exports = function(myName, myModel) {
  const myView = document.getElementById('Detail')
  const myData = Object.create(null)
  // fill myData
  for (let i = 0, els = myView.querySelectorAll('[data-name]'); i < els.length; i++) {
    let e = els[i]
    myData[e.dataset.name] = e
  }

  var myKey = null

  function input(e) {
    e.stopPropagation()
    app.run(myModel, _input, e.target)
  }

  function _input(target) {
    this.update(myKey, { [target.dataset.name]: target.textContent })
  }

  myView.addEventListener('input', input, true)

  app.add(myModel, {
    update_modified(key) {
      if (myKey !== key) return
      myData['modified'].textContent = this.get(myKey, 'modified')
    },
    [myName+'set'](key) {
      myKey = key
      for (let name in myData) {
        myData[name].textContent = this.get(myKey, name)
      }

      if (myView.classList.contains('hidden')) myView.classList.remove('hidden')
    },
    [myName+'clear']() {
      if (myView.classList.contains('hidden')) return
      myView.classList.add('hidden')
      myKey = null
    }
  })
}

},{"../app":4}],8:[function(require,module,exports){
'use strict'
var app = require('../app')

module.exports = function(myToolbar, myDetail, myModel) {
  const myView = document.getElementById('List')
  const myKeys = new WeakMap()

  var open_el = null
  var auto_open = false

  function click(e) {
    e.stopPropagation()
    app.run(myModel, _click, e.target)
  }
  function _click(target) {
    if (!open(target)) return

    this.emit(myToolbar+'enableButton', 'delete')
    this.emit(myDetail+'set', myKeys.get(open_el))
  }
  function open(target) {
    if (open_el) {
      if (open_el === target) return false // target is already open
      open_el.classList.remove('open')
    }
    open_el = target
    open_el.classList.add('open')
    return true // opened target
  }

  myView.addEventListener('click', click, true)

  app.add(myModel, {
    new(key) {
      var title = this.get(key, 'title')
      var li = document.createElement('li')
      li.textContent = title
      myKeys.set(li, key)
      myView.insertBefore(li, myView.childNodes[0])

      if (auto_open) {
        auto_open = false
        _click.call(this, li)
      }
    },
    update_title(key) {
      open_el.innerText = this.get(key, 'title')
    },
    delete(key) {
      open_el.remove()
      open_el = null
      this.emit(myToolbar+'disableButton', 'delete')
      this.emit(myDetail+'clear')
    },
    [myToolbar+'delete']() {
      this.delete(myKeys.get(open_el))
    },
    [myToolbar+'new']() {
      auto_open = true
      this.new()
    }
  })

  // Fill List with existing items
  app.run(myModel, function() {
    this.getKeys().forEach(key => this.emit('new', key))
  })
}
},{"../app":4}],9:[function(require,module,exports){
'use strict'
var app = require('../app')

module.exports = function(myName, myModel) {
  const myView = document.getElementById('Toolbar')
  const myData = Object.create(null)
  // fill myData
  {
    let els = myView.querySelectorAll('[data-name]')
    for (let i = 0; i < els.length; i++)
      myData[els[i].dataset.name] = els[i]
  }

  function click(e) {
    e.stopPropagation()
    app.run(myModel, _click, e.target)
  }

  function _click(target) {
    var name = target.dataset.name
    if (name !== 'delete') return this.emit(myName+name)
    if (window.confirm(`Are you sure you want to delete this ${myModel} ?`)) {
      this.emit(myName+name)
    }
  }

  myView.addEventListener('click', click, true)

  app.add(myModel, {
    [myName+'disableButton'](btn_name) {
      var btn = myData[btn_name]
      if (btn !== undefined) btn.disabled = true
      else console.warn('Cannot find button by name', btn_name)
    },
    [myName+'enableButton'](btn_name) {
      var btn = myData[btn_name]
      if (btn !== undefined) btn.disabled = false
      else console.warn('Cannot find button by name', btn_name)
    }
  })
}
},{"../app":4}],10:[function(require,module,exports){
'use strict'
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
},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvY29weS1vYmplY3QtZ3JhcGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXZlbnQtcm91dGVyL0V2ZW50Um91dGVyLmpzIiwibm9kZV9tb2R1bGVzL3ZpZXctbW9kZWwvVmlld01vZGVsLmpzIiwic3JjL2FwcC5qcyIsInNyYy9saWIvZ2VuZXJhdGVVVUlELmpzIiwic3JjL21vZGVscy9Ob3RlLmpzIiwic3JjL3ZpZXdzL0RldGFpbC5qcyIsInNyYy92aWV3cy9MaXN0LmpzIiwic3JjL3ZpZXdzL1Rvb2xiYXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc3RvcmFnZS1tYW5hZ2VyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypcbiBDb3B5IE9iamVjdCBHcmFwaHNcbiAgU291cmNlOiBodHRwczovL2dpdGh1Yi5jb20vdGh1cnQvY29weS1vYmplY3QtZ3JhcGhcbiAgU3VwcG9ydHM6IG5lc3RlZC9zZWxmLXJlZmVyZW5jaW5nIG9iamVjdHMsIG5lc3RlZC9zZWxmLXJlZmVyZW5jaW5nIGFycmF5cywgbnVtYmVycywgc3RyaW5ncywgbnVsbCB1bmRlZmluZWRcbiovXG5mdW5jdGlvbiBjb3B5T2JqZWN0R3JhcGgob2JqKSB7XG4gIGlmICh0eXBlb2YgV2Vha01hcCAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKCdjb3B5T2JqZWN0R3JhcGggcmVxdWlyZXMgV2Vha01hcCcpXG5cbiAgdmFyIF9wb29sID0gbmV3IFdlYWtNYXAoKVxuICByZXR1cm4gY3BPYmoob2JqKVxuXG4gIGZ1bmN0aW9uIGNwT2JqKG9iaikge1xuICAgIHZhciBjcFxuICAgIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JykgcmV0dXJuIG9ialxuICAgIGlmIChvYmogPT09IG51bGwpIHJldHVybiBudWxsXG4gICAgaWYgKF9wb29sLmhhcyhvYmopKSByZXR1cm4gX3Bvb2wuZ2V0KG9iaikgLy8gZm9yIHNlbGYtcmVmZXJlbmNlc1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSkgY3AgPSBvYmouc2xpY2UoKVxuICAgIGVsc2UgY3AgPSBPYmplY3QuYXNzaWduKHt9LCBvYmopXG5cbiAgICBfcG9vbC5zZXQob2JqLCBjcClcbiAgICByZXR1cm4gY3BQcm9wcyhjcClcbiAgfVxuICBmdW5jdGlvbiBjcFByb3BzKGNwKSB7XG4gICAgZm9yICh2YXIgcHJvcCBpbiBjcCkgY3BbcHJvcF0gPSBjcE9iaihjcFtwcm9wXSlcbiAgICByZXR1cm4gY3BcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvcHlPYmplY3RHcmFwaCIsIid1c2Ugc3RyaWN0J1xuY29uc3QgY29weU9iamVjdEdyYXBoID0gcmVxdWlyZSgnY29weS1vYmplY3QtZ3JhcGgnKVxuY29uc3QgbXlOYW1lID0gJ0V2ZW50Um91dGVyJ1xuXG5mdW5jdGlvbiBFdmVudFJvdXRlcihzaG91bGRMb2dDYWxscykge1xuICBjb25zdCBldmVudHMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG5cbiAgdmFyIHB1YmxpY19pbnRlcmZhY2UgPSB7XG4gICAgZ2V0RXZlbnRzKCkge1xuICAgICAgcmV0dXJuIGNvcHlPYmplY3RHcmFwaChldmVudHMpXG4gICAgfSxcblxuICAgIGFkZCh0eXBlLCBrZXksIGNhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gX2FkZCh0eXBlLCBrZXksIGNhbGxiYWNrLCBldmVudHMpXG4gICAgfSxcblxuICAgIHJlbW92ZSh0eXBlLCBrZXksIGNhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gX3JlbW92ZSh0eXBlLCBrZXksIGNhbGxiYWNrLCBldmVudHMpXG4gICAgfSxcblxuICAgIGVtaXQodHlwZSwga2V5LCBkYXRhKSB7XG4gICAgICByZXR1cm4gX2VtaXQodHlwZSwga2V5LCBkYXRhLCBldmVudHMpXG4gICAgfSxcblxuICAgIHB1cmdlKHR5cGUpIHtcbiAgICAgIHJldHVybiBfcHVyZ2UodHlwZSwgZXZlbnRzKVxuICAgIH1cbiAgfVxuXG4gIGlmIChzaG91bGRMb2dDYWxscykgeyAvLyBhZGQgbG9nZ2luZyBwcm94eVxuICAgIGZvciAobGV0IG1ldGhvZF9uYW1lIGluIHB1YmxpY19pbnRlcmZhY2UpIHtcbiAgICAgIHB1YmxpY19pbnRlcmZhY2VbbWV0aG9kX25hbWVdID0gY2xvc3VyZShtZXRob2RfbmFtZSwgcHVibGljX2ludGVyZmFjZVttZXRob2RfbmFtZV0pXG4gICAgfVxuICAgIGNvbnNvbGUuaW5mbyhteU5hbWUsICdpcyBsb2dnaW5nIGNhbGxzJylcbiAgfVxuICBmdW5jdGlvbiBjbG9zdXJlKG1ldGhvZF9uYW1lLCBtZXRob2QpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgY29uc29sZS5pbmZvKG15TmFtZSwgbWV0aG9kX25hbWUsIGFyZ3NbMF0sIGFyZ3NbMV0pXG4gICAgICByZXR1cm4gbWV0aG9kLmFwcGx5KG51bGwsIGFyZ3MpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIE9iamVjdC5mcmVlemUocHVibGljX2ludGVyZmFjZSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudFJvdXRlclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8qXG4gIHQgPSB0eXBlXG4gIGsgPSBrZXlcbiAgZCA9IGRhdGFcbiAgbyA9IG9iamVjdFxuICBjYiA9IGNhbGxiYWNrXG4qL1xuZnVuY3Rpb24gX3B1cmdlKHQsIG8pIHtcbiAgZGVsZXRlIG9bdF1cbn1cbmZ1bmN0aW9uIF9lbWl0KHQsIGssIGQsIG8pIHtcbiAgdmFyIG90ID0gb1t0XVxuICBpZiAob3QgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnNvbGUud2FybihteU5hbWUsICdldmVudCB0eXBlJywgdCwgaywgJ3dhcyBqdXN0IGZpcmVkIGJ1dCB0aGVyZSBhcmUgbm8gcmVnaXN0ZXJlZCBjYWxsYmFja3MnKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIHZhciBvdGsgPSBvdFtrXVxuICBpZiAob3RrID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zb2xlLndhcm4obXlOYW1lLCAnZXZlbnQgdHlwZScsIHQsIGssICd3YXMganVzdCBmaXJlZCBidXQgdGhlcmUgYXJlIG5vIHJlZ2lzdGVyZWQgY2FsbGJhY2tzJylcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGZvciAobGV0IGNiIG9mIG90aykgY2IoZClcblxuICByZXR1cm4gdHJ1ZVxufVxuZnVuY3Rpb24gX2FkZCh0LCBrLCBjYiwgbykge1xuICB2YXIgb3QgPSBvW3RdXG4gIGlmIChvdCA9PT0gdW5kZWZpbmVkKSBvdCA9IG9bdF0gPSB7fVxuXG4gIHZhciBvdGsgPSBvdFtrXVxuICBpZiAob3RrID09PSB1bmRlZmluZWQpIG90ayA9IG90W2tdID0gW11cblxuICBpZiAob3RrLmluY2x1ZGVzKGNiKSkge1xuICAgIGNvbnNvbGUud2FybihteU5hbWUsICdldmVudCB0eXBlJywgdCwgaywgJ2FscmVhZHkgaGFzIHRoaXMgY2FsbGJhY2sgZnVuY3Rpb24nKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIGVsc2Ugb3RrLnB1c2goY2IpXG5cbiAgcmV0dXJuIHRydWVcbn1cbmZ1bmN0aW9uIF9yZW1vdmUodCwgaywgY2IsIG8pIHtcbiAgdmFyIG90ID0gb1t0XVxuICBpZiAob3QgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnNvbGUud2FybihteU5hbWUsICdjYW5ub3QgZmluZCB0eXBlJywgdClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICB2YXIgb3RrID0gb3Rba11cbiAgaWYgKG90ayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc29sZS53YXJuKG15TmFtZSwgJ2Nhbm5vdCBmaW5kIGtleScsIGssICdpbiB0eXBlJywgdClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICBpZiAoIW90ay5pbmNsdWRlcyhjYikpIHtcbiAgICBjb25zb2xlLndhcm4obXlOYW1lLCAnY2Fubm90IGZpbmQgdGhpcyBjYWxsYmFjayBmdW5jdGlvbiB1bmRlciBrZXknLCBrLCAnaW4gdHlwZScsIHQpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBvdGsuc3BsaWNlKG90ay5pbmRleE9mKGNiKSwgMSlcblxuICBpZiAoIW90ay5sZW5ndGgpIHtcbiAgICBkZWxldGUgb3Rba11cbiAgICBpZiAoIU9iamVjdC5rZXlzKG90KS5sZW5ndGgpIGRlbGV0ZSBvW3RdXG4gIH1cblxuICByZXR1cm4gdHJ1ZVxufSIsIid1c2Ugc3RyaWN0J1xuY29uc3QgRXZlbnRSb3V0ZXIgPSByZXF1aXJlKCdldmVudC1yb3V0ZXInKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIFZpZXdNb2RlbChzaG91bGRMb2dFdmVudHMpIHtcbiAgY29uc3QgTSA9IHt9IC8vIG1vZGVsc1xuICB2YXIgUiAvLyByb3V0ZXJcblxuICBpZiAoc2hvdWxkTG9nRXZlbnRzKSB7XG4gICAgUiA9IEV2ZW50Um91dGVyKHRydWUpXG4gIH0gZWxzZSB7XG4gICAgUiA9IEV2ZW50Um91dGVyKGZhbHNlKVxuICB9XG5cbiAgLy8gR2V0IGEgbGlzdCBvZiBhbGwgbW9kZWwgbmFtZXNcbiAgZnVuY3Rpb24gVmlld01vZGVsKCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhNKVxuICB9XG4gIC8vIENyZWF0ZSBhIG5ldyBtb2RlbFxuICBWaWV3TW9kZWwuY3JlYXRlID0gZnVuY3Rpb24oa2V5LCBleHRlbmRfbWVtYmVycykge1xuICAgIHZhciBtb2RlbCA9IE1ba2V5XVxuICAgIGlmIChtb2RlbCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2VcblxuICAgIG1vZGVsID0gTVtrZXldID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgIG1vZGVsLmluc3RhbmNlID0gbW9kZWxJbnN0YW5jZShrZXkpXG4gICAgbW9kZWwubGlzdGVuZXJzID0gbmV3IFdlYWtNYXAoKSAvLyBmb3IgbWFwcGluZyBsaXN0ZW5lciB0byBpdCdzIG1vZGVsLWJvdW5kIGNvcHlcbiAgICBPYmplY3QuZnJlZXplKE9iamVjdC5hc3NpZ24obW9kZWwuaW5zdGFuY2UsIGV4dGVuZF9tZW1iZXJzKSlcblxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgLy8gUnVuIGEgZnVuY3Rpb24gaW5zaWRlIG9mIGEgbW9kZWxcbiAgVmlld01vZGVsLnJ1biA9IGZ1bmN0aW9uKGtleSwgZnVuY1RvUnVuLCAuLi5hcmdzKSB7XG4gICAgdmFyIG1vZGVsID0gTVtrZXldXG4gICAgaWYgKG1vZGVsID09PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZVxuXG4gICAgZnVuY1RvUnVuLmFwcGx5KG1vZGVsLmluc3RhbmNlLCBhcmdzKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgLy8gQ2hlY2sgaWYgYSBtb2RlbCBleGlzdHNcbiAgVmlld01vZGVsLmV4aXN0cyA9IGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChNW2tleV0gPT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlXG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICAvLyBEZWxldGUgYW4gZXhpc3RpbmcgbW9kZWwgYW5kIGFsbCBldmVudCBsaXN0ZW5lcnMgb2YgdGhhdCBtb2RlbFxuICBWaWV3TW9kZWwuZGVzdHJveSA9IGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChNW2tleV0gPT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlXG5cbiAgICBSLnB1cmdlKGtleSlcbiAgICBkZWxldGUgTVtrZXldXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8vIEFkZCBldmVudCBsaXN0ZW5lcnMgdG8gdGhpcyBtb2RlbFxuICBWaWV3TW9kZWwuYWRkID0gZnVuY3Rpb24oa2V5LCBtZXRob2RzKSB7XG4gICAgdmFyIHJlc3VsdHMgPSB7fVxuICAgIHZhciBtb2RlbCA9IE1ba2V5XVxuICAgIGlmIChtb2RlbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2VcblxuICAgIGZvciAobGV0IG5hbWUgaW4gbWV0aG9kcykge1xuICAgICAgbGV0IG1ldGhvZCA9IG1ldGhvZHNbbmFtZV1cbiAgICAgIGxldCBib3VuZE1ldGhvZFxuICAgICAgaWYgKHR5cGVvZiBtZXRob2QgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmVzdWx0c1tuYW1lXSA9IGZhbHNlXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBpZiAobW9kZWwubGlzdGVuZXJzLmhhcyhtZXRob2QpKSB7XG4gICAgICAgIGJvdW5kTWV0aG9kID0gbW9kZWwubGlzdGVuZXJzLmdldChtZXRob2QpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBib3VuZE1ldGhvZCA9IG1ldGhvZC5iaW5kKG1vZGVsLmluc3RhbmNlKVxuICAgICAgICBtb2RlbC5saXN0ZW5lcnMuc2V0KG1ldGhvZCwgYm91bmRNZXRob2QpXG4gICAgICB9XG4gICAgICByZXN1bHRzW25hbWVdID0gUi5hZGQoa2V5LCBuYW1lLCBib3VuZE1ldGhvZClcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0c1xuICB9LFxuICAvLyBSZW1vdmUgZXZlbnQgbGlzdGVuZXJzIGZyb20gdGhpcyBtb2RlbFxuICBWaWV3TW9kZWwucmVtb3ZlID0gZnVuY3Rpb24oa2V5LCBtZXRob2RzKSB7XG4gICAgdmFyIHJlc3VsdHMgPSB7fVxuICAgIHZhciBtb2RlbCA9IE1ba2V5XVxuICAgIGlmIChtb2RlbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2VcblxuICAgIGZvciAobGV0IG5hbWUgaW4gbWV0aG9kcykge1xuICAgICAgbGV0IG1ldGhvZCA9IG1ldGhvZHNbbmFtZV1cblxuICAgICAgaWYgKHR5cGVvZiBtZXRob2QgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmVzdWx0c1tuYW1lXSA9IGZhbHNlXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBpZiAobW9kZWwubGlzdGVuZXJzLmhhcyhtZXRob2QpKSB7XG4gICAgICAgIHJlc3VsdHNbbmFtZV0gPSBSLnJlbW92ZShrZXksIG5hbWUsIG1vZGVsLmxpc3RlbmVycy5nZXQobWV0aG9kKSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0c1xuICB9XG5cbiAgLy8gY2xvc3VyZSBvdmVyIG1vZGVsIGtleVxuICBmdW5jdGlvbiBtb2RlbEluc3RhbmNlKF9rZXkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgLy8gVGhlIG5hbWUgb2YgdGhpcyBtb2RlbFxuICAgICAgbmFtZTogX2tleSxcbiAgICAgIC8vIEVtaXQgYW4gZXZlbnQgb24gdGhpcyBtb2RlbFxuICAgICAgZW1pdChuYW1lLCBkYXRhKSB7XG4gICAgICAgIFIuZW1pdChfa2V5LCBuYW1lLCBkYXRhKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gVmlld01vZGVsXG59IiwiJ3VzZSBzdHJpY3QnXG52YXIgYXBwID0gcmVxdWlyZSgndmlldy1tb2RlbCcpKHRydWUpXG5tb2R1bGUuZXhwb3J0cyA9IGFwcFxuXG5sZXQgdG9vbGJhcl9uYW1lID0gJ3Rvb2xiYXJfJ1xubGV0IGRldGFpbF9uYW1lID0gJ2RldGFpbF8nXG5sZXQgbW9kZWxfbmFtZSA9IHJlcXVpcmUoJy4vbW9kZWxzL05vdGUnKSgpXG5cbnJlcXVpcmUoJy4vdmlld3MvVG9vbGJhcicpKHRvb2xiYXJfbmFtZSwgbW9kZWxfbmFtZSlcbnJlcXVpcmUoJy4vdmlld3MvRGV0YWlsJykoZGV0YWlsX25hbWUsIG1vZGVsX25hbWUpXG5yZXF1aXJlKCcuL3ZpZXdzL0xpc3QnKSh0b29sYmFyX25hbWUsIGRldGFpbF9uYW1lLCBtb2RlbF9uYW1lKSIsIi8vIFNvdXJjZTogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvODgwOTQ3MlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICBpZiAod2luZG93LnBlcmZvcm1hbmNlICYmIHR5cGVvZiB3aW5kb3cucGVyZm9ybWFuY2Uubm93ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBkICs9IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvL3VzZSBoaWdoLXByZWNpc2lvbiB0aW1lciBpZiBhdmFpbGFibGVcbiAgfVxuICB2YXIgdXVpZCA9ICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24gKGMpIHtcbiAgICB2YXIgciA9IChkICsgTWF0aC5yYW5kb20oKSAqIDE2KSAlIDE2IHwgMFxuICAgIGQgPSBNYXRoLmZsb29yKGQgLyAxNilcbiAgICByZXR1cm4gKGMgPT0gJ3gnID8gciA6IChyICYgMHgzIHwgMHg4KSkudG9TdHJpbmcoMTYpXG4gIH0pXG4gIHJldHVybiB1dWlkXG59IiwiJ3VzZSBzdHJpY3QnXG52YXIgYXBwID0gcmVxdWlyZSgnLi4vYXBwJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgY29uc3QgbXlOYW1lID0gJ05vdGUnXG4gIGNvbnN0IFNUT1JFID0gcmVxdWlyZSgnc3RvcmFnZS1tYW5hZ2VyJykoJ2xvY2FsU3RvcmFnZScpXG4gIGNvbnN0IGdlbmVyYXRlVVVJRCA9IHJlcXVpcmUoJy4uL2xpYi9nZW5lcmF0ZVVVSUQnKVxuXG4gIGNvbnN0IE5PVEVTID0gU1RPUkUuZ2V0QWxsKClcbiAgZm9yIChsZXQga2V5IGluIE5PVEVTKSBOT1RFU1trZXldID0gSlNPTi5wYXJzZShOT1RFU1trZXldKVxuXG4gIGNvbnN0IGJsYW5rID0ge1xuICAgIHRpdGxlOiAnTmV3ICcgKyBteU5hbWUsXG4gICAgYm9keTogJ0VudGVyIHNvbWUgYm9keSB0ZXh0IGhlcmUnLFxuICAgIGNyZWF0ZWQ6IG51bGwsXG4gICAgbW9kaWZpZWQ6IG51bGxcbiAgfVxuXG4gIGFwcC5jcmVhdGUobXlOYW1lLCB7XG4gICAgbmV3KCkge1xuICAgICAgdmFyIGtleSA9IGdlbmVyYXRlVVVJRCgpXG4gICAgICBibGFuay5jcmVhdGVkID0gYmxhbmsubW9kaWZpZWQgPSBEYXRlKCkudG9TdHJpbmcoKVxuXG4gICAgICBTVE9SRS5zZXQoa2V5LCBibGFuaylcbiAgICAgIE5PVEVTW2tleV0gPSBPYmplY3QuYXNzaWduKHt9LCBibGFuaylcblxuICAgICAgdGhpcy5lbWl0KCduZXcnLCBrZXkpXG4gICAgfSxcbiAgICBnZXQoa2V5LCBwcm9wKSB7XG4gICAgICB2YXIgbmsgPSBOT1RFU1trZXldXG4gICAgICBpZiAobmsgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGNvbnNvbGUud2Fybih0aGlzLm5hbWUsICdrZXknLCBrZXksICdkb2VzIG5vdCBleGlzdCcpXG4gICAgICB2YXIgbmtwID0gbmtbcHJvcF1cbiAgICAgIGlmIChua3AgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGNvbnNvbGUud2Fybih0aGlzLm5hbWUsICdwcm9wZXJ0eScsIHByb3AsICdmb3Iga2V5Jywga2V5LCAnZG9lcyBub3QgZXhpc3QnKVxuICAgICAgaWYgKHR5cGVvZiBua3AgPT09ICdvYmplY3QnICYmIG5rcCAhPT0gbnVsbCkgcmV0dXJuIGNvbnNvbGUud2Fybih0aGlzLm5hbWUsICdwcm9wZXJ0eScsIHByb3AsICdmb3Iga2V5Jywga2V5LCAnaXMgYW4gb2JqZWN0LiBPbmx5IHByaW1pdGl2ZXMgY2FuIGJlIGFjY2Vzc2VkLicpXG5cbiAgICAgIHJldHVybiBua3BcbiAgICB9LFxuICAgIGdldEtleXMoKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoTk9URVMpXG4gICAgfSxcbiAgICB1cGRhdGUoa2V5LCBvYmopIHtcbiAgICAgIHZhciBjaGFuZ2VkID0gZmFsc2VcbiAgICAgIHZhciBuayA9IE5PVEVTW2tleV1cbiAgICAgIGlmIChuayA9PT0gdW5kZWZpbmVkKSByZXR1cm4gY29uc29sZS53YXJuKHRoaXMubmFtZSwgJ2tleScsIGtleSwgJ2RvZXMgbm90IGV4aXN0JylcbiAgICAgIGZvciAobGV0IHByb3AgaW4gb2JqKSB7XG4gICAgICAgIGxldCBua3AgPSBua1twcm9wXVxuICAgICAgICBpZiAobmtwID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4odGhpcy5uYW1lLCAncHJvcGVydHknLCBwcm9wLCAnZm9yIGtleScsIGtleSwgJ2RvZXMgbm90IGV4aXN0JylcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIGlmIChua3AgIT09IG9ialtwcm9wXSkge1xuICAgICAgICAgIG5rW3Byb3BdID0gb2JqW3Byb3BdXG4gICAgICAgICAgdGhpcy5lbWl0KCd1cGRhdGVfJytwcm9wLCBrZXkpXG4gICAgICAgICAgY2hhbmdlZCA9IHRydWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgICAgTk9URVNba2V5XS5tb2RpZmllZCA9IERhdGUoKS50b1N0cmluZygpXG4gICAgICAgIHRoaXMuZW1pdCgndXBkYXRlX21vZGlmaWVkJywga2V5KVxuICAgICAgICBTVE9SRS5zZXQoa2V5LCBOT1RFU1trZXldKVxuICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlKGtleSkge1xuICAgICAgZGVsZXRlIE5PVEVTW2tleV1cbiAgICAgIFNUT1JFLnJlbW92ZShrZXkpXG4gICAgICB0aGlzLmVtaXQoJ2RlbGV0ZScsIGtleSlcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIG15TmFtZVxufVxuIiwiJ3VzZSBzdHJpY3QnXG52YXIgYXBwID0gcmVxdWlyZSgnLi4vYXBwJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihteU5hbWUsIG15TW9kZWwpIHtcbiAgY29uc3QgbXlWaWV3ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ0RldGFpbCcpXG4gIGNvbnN0IG15RGF0YSA9IE9iamVjdC5jcmVhdGUobnVsbClcbiAgLy8gZmlsbCBteURhdGFcbiAgZm9yIChsZXQgaSA9IDAsIGVscyA9IG15Vmlldy5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1uYW1lXScpOyBpIDwgZWxzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGUgPSBlbHNbaV1cbiAgICBteURhdGFbZS5kYXRhc2V0Lm5hbWVdID0gZVxuICB9XG5cbiAgdmFyIG15S2V5ID0gbnVsbFxuXG4gIGZ1bmN0aW9uIGlucHV0KGUpIHtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgYXBwLnJ1bihteU1vZGVsLCBfaW5wdXQsIGUudGFyZ2V0KVxuICB9XG5cbiAgZnVuY3Rpb24gX2lucHV0KHRhcmdldCkge1xuICAgIHRoaXMudXBkYXRlKG15S2V5LCB7IFt0YXJnZXQuZGF0YXNldC5uYW1lXTogdGFyZ2V0LnRleHRDb250ZW50IH0pXG4gIH1cblxuICBteVZpZXcuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBpbnB1dCwgdHJ1ZSlcblxuICBhcHAuYWRkKG15TW9kZWwsIHtcbiAgICB1cGRhdGVfbW9kaWZpZWQoa2V5KSB7XG4gICAgICBpZiAobXlLZXkgIT09IGtleSkgcmV0dXJuXG4gICAgICBteURhdGFbJ21vZGlmaWVkJ10udGV4dENvbnRlbnQgPSB0aGlzLmdldChteUtleSwgJ21vZGlmaWVkJylcbiAgICB9LFxuICAgIFtteU5hbWUrJ3NldCddKGtleSkge1xuICAgICAgbXlLZXkgPSBrZXlcbiAgICAgIGZvciAobGV0IG5hbWUgaW4gbXlEYXRhKSB7XG4gICAgICAgIG15RGF0YVtuYW1lXS50ZXh0Q29udGVudCA9IHRoaXMuZ2V0KG15S2V5LCBuYW1lKVxuICAgICAgfVxuXG4gICAgICBpZiAobXlWaWV3LmNsYXNzTGlzdC5jb250YWlucygnaGlkZGVuJykpIG15Vmlldy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIH0sXG4gICAgW215TmFtZSsnY2xlYXInXSgpIHtcbiAgICAgIGlmIChteVZpZXcuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSkgcmV0dXJuXG4gICAgICBteVZpZXcuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgICAgIG15S2V5ID0gbnVsbFxuICAgIH1cbiAgfSlcbn1cbiIsIid1c2Ugc3RyaWN0J1xudmFyIGFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obXlUb29sYmFyLCBteURldGFpbCwgbXlNb2RlbCkge1xuICBjb25zdCBteVZpZXcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnTGlzdCcpXG4gIGNvbnN0IG15S2V5cyA9IG5ldyBXZWFrTWFwKClcblxuICB2YXIgb3Blbl9lbCA9IG51bGxcbiAgdmFyIGF1dG9fb3BlbiA9IGZhbHNlXG5cbiAgZnVuY3Rpb24gY2xpY2soZSkge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICBhcHAucnVuKG15TW9kZWwsIF9jbGljaywgZS50YXJnZXQpXG4gIH1cbiAgZnVuY3Rpb24gX2NsaWNrKHRhcmdldCkge1xuICAgIGlmICghb3Blbih0YXJnZXQpKSByZXR1cm5cblxuICAgIHRoaXMuZW1pdChteVRvb2xiYXIrJ2VuYWJsZUJ1dHRvbicsICdkZWxldGUnKVxuICAgIHRoaXMuZW1pdChteURldGFpbCsnc2V0JywgbXlLZXlzLmdldChvcGVuX2VsKSlcbiAgfVxuICBmdW5jdGlvbiBvcGVuKHRhcmdldCkge1xuICAgIGlmIChvcGVuX2VsKSB7XG4gICAgICBpZiAob3Blbl9lbCA9PT0gdGFyZ2V0KSByZXR1cm4gZmFsc2UgLy8gdGFyZ2V0IGlzIGFscmVhZHkgb3BlblxuICAgICAgb3Blbl9lbC5jbGFzc0xpc3QucmVtb3ZlKCdvcGVuJylcbiAgICB9XG4gICAgb3Blbl9lbCA9IHRhcmdldFxuICAgIG9wZW5fZWwuY2xhc3NMaXN0LmFkZCgnb3BlbicpXG4gICAgcmV0dXJuIHRydWUgLy8gb3BlbmVkIHRhcmdldFxuICB9XG5cbiAgbXlWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2xpY2ssIHRydWUpXG5cbiAgYXBwLmFkZChteU1vZGVsLCB7XG4gICAgbmV3KGtleSkge1xuICAgICAgdmFyIHRpdGxlID0gdGhpcy5nZXQoa2V5LCAndGl0bGUnKVxuICAgICAgdmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKVxuICAgICAgbGkudGV4dENvbnRlbnQgPSB0aXRsZVxuICAgICAgbXlLZXlzLnNldChsaSwga2V5KVxuICAgICAgbXlWaWV3Lmluc2VydEJlZm9yZShsaSwgbXlWaWV3LmNoaWxkTm9kZXNbMF0pXG5cbiAgICAgIGlmIChhdXRvX29wZW4pIHtcbiAgICAgICAgYXV0b19vcGVuID0gZmFsc2VcbiAgICAgICAgX2NsaWNrLmNhbGwodGhpcywgbGkpXG4gICAgICB9XG4gICAgfSxcbiAgICB1cGRhdGVfdGl0bGUoa2V5KSB7XG4gICAgICBvcGVuX2VsLmlubmVyVGV4dCA9IHRoaXMuZ2V0KGtleSwgJ3RpdGxlJylcbiAgICB9LFxuICAgIGRlbGV0ZShrZXkpIHtcbiAgICAgIG9wZW5fZWwucmVtb3ZlKClcbiAgICAgIG9wZW5fZWwgPSBudWxsXG4gICAgICB0aGlzLmVtaXQobXlUb29sYmFyKydkaXNhYmxlQnV0dG9uJywgJ2RlbGV0ZScpXG4gICAgICB0aGlzLmVtaXQobXlEZXRhaWwrJ2NsZWFyJylcbiAgICB9LFxuICAgIFtteVRvb2xiYXIrJ2RlbGV0ZSddKCkge1xuICAgICAgdGhpcy5kZWxldGUobXlLZXlzLmdldChvcGVuX2VsKSlcbiAgICB9LFxuICAgIFtteVRvb2xiYXIrJ25ldyddKCkge1xuICAgICAgYXV0b19vcGVuID0gdHJ1ZVxuICAgICAgdGhpcy5uZXcoKVxuICAgIH1cbiAgfSlcblxuICAvLyBGaWxsIExpc3Qgd2l0aCBleGlzdGluZyBpdGVtc1xuICBhcHAucnVuKG15TW9kZWwsIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZ2V0S2V5cygpLmZvckVhY2goa2V5ID0+IHRoaXMuZW1pdCgnbmV3Jywga2V5KSlcbiAgfSlcbn0iLCIndXNlIHN0cmljdCdcbnZhciBhcHAgPSByZXF1aXJlKCcuLi9hcHAnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG15TmFtZSwgbXlNb2RlbCkge1xuICBjb25zdCBteVZpZXcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnVG9vbGJhcicpXG4gIGNvbnN0IG15RGF0YSA9IE9iamVjdC5jcmVhdGUobnVsbClcbiAgLy8gZmlsbCBteURhdGFcbiAge1xuICAgIGxldCBlbHMgPSBteVZpZXcucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtbmFtZV0nKVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWxzLmxlbmd0aDsgaSsrKVxuICAgICAgbXlEYXRhW2Vsc1tpXS5kYXRhc2V0Lm5hbWVdID0gZWxzW2ldXG4gIH1cblxuICBmdW5jdGlvbiBjbGljayhlKSB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICAgIGFwcC5ydW4obXlNb2RlbCwgX2NsaWNrLCBlLnRhcmdldClcbiAgfVxuXG4gIGZ1bmN0aW9uIF9jbGljayh0YXJnZXQpIHtcbiAgICB2YXIgbmFtZSA9IHRhcmdldC5kYXRhc2V0Lm5hbWVcbiAgICBpZiAobmFtZSAhPT0gJ2RlbGV0ZScpIHJldHVybiB0aGlzLmVtaXQobXlOYW1lK25hbWUpXG4gICAgaWYgKHdpbmRvdy5jb25maXJtKGBBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgJHtteU1vZGVsfSA/YCkpIHtcbiAgICAgIHRoaXMuZW1pdChteU5hbWUrbmFtZSlcbiAgICB9XG4gIH1cblxuICBteVZpZXcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjbGljaywgdHJ1ZSlcblxuICBhcHAuYWRkKG15TW9kZWwsIHtcbiAgICBbbXlOYW1lKydkaXNhYmxlQnV0dG9uJ10oYnRuX25hbWUpIHtcbiAgICAgIHZhciBidG4gPSBteURhdGFbYnRuX25hbWVdXG4gICAgICBpZiAoYnRuICE9PSB1bmRlZmluZWQpIGJ0bi5kaXNhYmxlZCA9IHRydWVcbiAgICAgIGVsc2UgY29uc29sZS53YXJuKCdDYW5ub3QgZmluZCBidXR0b24gYnkgbmFtZScsIGJ0bl9uYW1lKVxuICAgIH0sXG4gICAgW215TmFtZSsnZW5hYmxlQnV0dG9uJ10oYnRuX25hbWUpIHtcbiAgICAgIHZhciBidG4gPSBteURhdGFbYnRuX25hbWVdXG4gICAgICBpZiAoYnRuICE9PSB1bmRlZmluZWQpIGJ0bi5kaXNhYmxlZCA9IGZhbHNlXG4gICAgICBlbHNlIGNvbnNvbGUud2FybignQ2Fubm90IGZpbmQgYnV0dG9uIGJ5IG5hbWUnLCBidG5fbmFtZSlcbiAgICB9XG4gIH0pXG59IiwiJ3VzZSBzdHJpY3QnXG5mdW5jdGlvbiBTdG9yYWdlTWFuYWdlcih0eXBlKSB7XG4gIGlmICh0eXBlICE9PSAnbG9jYWxTdG9yYWdlJyAmJiB0eXBlICE9PSAnc2Vzc2lvblN0b3JhZ2UnKSB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoYFN0b3JhZ2VNYW5hZ2VyIGRvZXMgbm90IHN1cHBvcnQgc3RvcmFnZSB0eXBlICR7dHlwZX1gKVxuXG4gIGNvbnN0IG15U3RvcmUgPSB3aW5kb3dbdHlwZV1cblxuICByZXR1cm4ge1xuICAgIGdldChrZXkpIHtcbiAgICAgIHZhciBpdGVtID0gbXlTdG9yZS5nZXRJdGVtKGtleSlcbiAgICAgIGlmIChpdGVtICE9PSBudWxsKSByZXR1cm4gaXRlbVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfSxcbiAgICBnZXRBbGwoKSB7XG4gICAgICB2YXIga2V5ID0gJydcbiAgICAgIHZhciBtYXAgPSB7fVxuICAgICAgdmFyIGl0ZW0gPSBudWxsXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG15U3RvcmUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAga2V5ID0gbXlTdG9yZS5rZXkoaSlcbiAgICAgICAgaWYgKH5rZXkuaW5kZXhPZignXycpKSBjb250aW51ZVxuICAgICAgICBpdGVtID0gbXlTdG9yZS5nZXRJdGVtKGtleSlcbiAgICAgICAgbWFwW2tleV0gPSBpdGVtXG4gICAgICB9XG4gICAgICByZXR1cm4gbWFwXG4gICAgfSxcbiAgICBzZXQoa2V5LCBvYmopIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBkYXRhXG4gICAgICAgIGlmICh0eXBlb2Ygb2JqICE9PSAnc3RyaW5nJykgZGF0YSA9IEpTT04uc3RyaW5naWZ5KG9iailcbiAgICAgICAgZWxzZSBkYXRhID0gb2JqXG5cbiAgICAgICAgbXlTdG9yZS5zZXRJdGVtKGtleSwgZGF0YSlcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cbiAgICAgIGNhdGNoKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9LFxuICAgIHJlbW92ZShrZXkpIHtcbiAgICAgIHZhciBpdGVtID0gbXlTdG9yZS5nZXRJdGVtKGtleSlcbiAgICAgIGlmIChpdGVtID09PSBudWxsKSByZXR1cm4gZmFsc2VcbiAgICAgIG15U3RvcmUucmVtb3ZlSXRlbShrZXkpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH0sXG4gICAgbGVuZ3RoKCkge1xuICAgICAgcmV0dXJuIG15U3RvcmUubGVuZ3RoXG4gICAgfSxcbiAgICBjbGVhcigpIHtcbiAgICAgIG15U3RvcmUuY2xlYXIoKVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2VNYW5hZ2VyIl19
