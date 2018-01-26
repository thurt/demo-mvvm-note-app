const app = require('../app');

module.exports = function(myName, myModel) {
  const myView = document.getElementById('Toolbar');
  const myData = Object.create(null);
  // fill myData
  for (
    let i = 0, els = myView.querySelectorAll('[data-name]');
    i < els.length;
    i++
  ) {
    myData[els[i].dataset.name] = els[i];
  }

  function click(e) {
    e.stopPropagation();
    app.run(myModel, _click, e.target);
  }

  function _click(target) {
    const name = target.dataset.name;
    if (name !== 'delete') return this.emit(myName + name);
    if (window.confirm(`Are you sure you want to delete this ${myModel} ?`)) {
      this.emit(myName + name);
    }
  }

  myView.addEventListener('click', click, true);

  app.add(myModel, {
    [myName + 'disableButton'](btn_name) {
      const btn = myData[btn_name];
      if (btn !== undefined) btn.disabled = true;
      else console.warn('Cannot find button by name', btn_name);
    },
    [myName + 'enableButton'](btn_name) {
      const btn = myData[btn_name];
      if (btn !== undefined) btn.disabled = false;
      else console.warn('Cannot find button by name', btn_name);
    },
  });
};
