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
    this.update(myKey, { [target.dataset.name]: target.innerHTML })
  }

  myView.addEventListener('input', input, true)

  app.add(myModel, {
    update_modified(key) {
      if (myKey !== key) return
      myData['modified'].textContent = 'Modified: ' + this.get(myKey, 'modified')
    },
    [myName+'set'](key) {
      myKey = key
      for (let name in myData) {
        var value = this.get(myKey, name)
        if (name === 'created' || name === 'modified') {
          value = name.charAt(0).toUpperCase() + name.slice(1) + ': ' + value
        }
        myData[name].innerHTML = value
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
