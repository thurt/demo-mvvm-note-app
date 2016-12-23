'use strict'
const app = require('../app')

module.exports = function(myName, myModel) {
  const myView = document.getElementById('Detail')
  const myData = Object.create(null)
  const myEmpty = document.getElementById('Empty')

  // fill myData
  for (let i = 0, els = myView.querySelectorAll('[data-name]'); i < els.length; i++) {
    let e = els[i]
    myData[e.dataset.name] = e
  }

  let myKey = null

  function input(e) {
    e.stopPropagation()
    app.run(myModel, _input, e.target)
  }

  function _input(target) {
    switch (target.dataset.name) {
      case 'title':
        this.update(myKey, { [target.dataset.name]: target.innerText })
        break
      case 'body':
        this.update(myKey, { [target.dataset.name]: target.innerHTML })
        break
      default:
        console.warn(myName, ': this view-model does not recognize dataset name', target.dataset.name)
        break
    }
  }

  myView.addEventListener('input', input, true)
  myData['title'].addEventListener('keydown', function(e) {
    if (e.keyCode === 13) { // enter
      e.preventDefault()
    }
  })

  function clearSelections() {
    Object.keys(myData).forEach(key => myData[key].blur())
    window.getSelection().removeAllRanges()
  }

  app.add(myModel, {
    update_modified(key) {
      if (myKey !== key) return
      myData['modified'].textContent = 'Modified: ' + this.get(myKey, 'modified')
    },
    [myName+'set'](key) {
      clearSelections()
      myKey = key
      for (let name in myData) {
        let value = this.get(myKey, name)
        if (name === 'created' || name === 'modified') {
          value = name.charAt(0).toUpperCase() + name.slice(1) + ': ' + value
        }
        myData[name].innerHTML = value
      }

      if (myView.classList.contains('hidden')) {
        myView.classList.remove('hidden')
        myEmpty.classList.add('hidden')
      }
    },
    [myName+'clear']() {
      if (myView.classList.contains('hidden')) return
      myView.classList.add('hidden')
      myEmpty.classList.remove('hidden')
      myKey = null
      clearSelections()
    }
  })
}
