'use strict'
const app = require('../app')

module.exports = function(myToolbar, myDetail, myModel) {
  const myView = document.getElementById('List')
  const myKeys = new WeakMap()

  let open_el = null
  let auto_open = false

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
      open_el.classList.remove('active')
    }
    open_el = target
    open_el.classList.add('active')
    return true // opened target
  }

  function checkForEmptyTitle(title) {
    if (title === '') {
      return '<Untitled>'
    } else {
      return title
    }
  }

  myView.addEventListener('click', click, true)

  app.add(myModel, {
    new(key) {
      const title = checkForEmptyTitle(this.get(key, 'title'))
      const btn = document.createElement('button')
      btn.textContent = title
      btn.setAttribute('title', title)
      btn.classList.add('btn')
      btn.classList.add('btn-default')
      myKeys.set(btn, key)
      myView.insertBefore(btn, myView.childNodes[0])

      if (auto_open) {
        auto_open = false
        _click.call(this, btn)
      }
    },
    update_title(key) {
      const title = checkForEmptyTitle(this.get(key, 'title'))
      open_el.innerText = title
      open_el.setAttribute('title', title)
    },
    delete(key) {
      const next_sibling = open_el.nextElementSibling
      open_el.remove()
      open_el = null
      if (next_sibling === null) {
        this.emit(myToolbar+'disableButton', 'delete')
        this.emit(myDetail+'clear')
      } else {
        app.run(myModel, _click, next_sibling)
      }
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
    this.getKeys()
      .sort((a, b) => { // sort by created date descending
        const a_created = Date.parse(this.get(a, 'created'))
        const b_created = Date.parse(this.get(b, 'created'))
        return (a_created > b_created)
      })
      .forEach(key => this.emit('new', key))
  })
}
