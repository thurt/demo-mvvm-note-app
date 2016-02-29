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