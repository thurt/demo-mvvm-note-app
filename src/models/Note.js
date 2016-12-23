'use strict'
const app = require('../app')

module.exports = function() {
  const myName = 'Note'
  const STORE = require('storage-manager')('localStorage')
  const generateUUID = require('../lib/generateUUID')

  const NOTES = STORE.getAll()
  for (let key in NOTES) NOTES[key] = JSON.parse(NOTES[key])

  const blank = {
    title: '',
    body: '',
    created: null,
    modified: null
  }

  app.create(myName, {
    new() {
      const key = generateUUID()
      blank.created = blank.modified = new Date().toString()

      STORE.set(key, blank)
      NOTES[key] = Object.assign({}, blank)

      this.emit('new', key)
    },
    get(key, prop) {
      const nk = NOTES[key]
      if (nk === undefined) return console.warn(this.name, 'key', key, 'does not exist')
      const nkp = nk[prop]
      if (nkp === undefined) return console.warn(this.name, 'property', prop, 'for key', key, 'does not exist')
      if (typeof nkp === 'object' && nkp !== null) return console.warn(this.name, 'property', prop, 'for key', key, 'is an object. Only primitives can be accessed.')

      return nkp
    },
    getKeys() {
      return Object.keys(NOTES)
    },
    update(key, obj) {
      let changed = false
      const nk = NOTES[key]
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
