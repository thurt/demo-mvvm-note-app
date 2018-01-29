import ViewModel = require('view-model');

export default function Detail(
  myName: string,
  myModel: string,
  app: ViewModel.Interface,
) {
  const myView = document.getElementById('Detail');
  const myData = Object.create(null);
  const myEmpty = document.getElementById('Empty');

  // fill myData
  for (
    let i = 0,
      els: NodeListOf<HTMLElement> = myView.querySelectorAll('[data-name]');
    i < els.length;
    i++
  ) {
    let e = els[i];
    myData[e.dataset.name] = e;
  }

  let myKey: string = null;

  function input(e: Event) {
    e.stopPropagation();
    app.run(myModel, _input, e.target);
  }

  function _input(target: HTMLElement) {
    switch (target.dataset.name) {
      case 'title':
        this.update(myKey, {[target.dataset.name]: target.innerText});
        break;
      case 'body':
        this.update(myKey, {[target.dataset.name]: target.innerHTML});
        break;
      case 'published':
        if (target instanceof HTMLInputElement) {
          this.update(myKey, {[target.dataset.name]: target.checked});
          break;
        }
      default:
        console.warn(
          myName,
          ': this view-model does not recognize dataset name',
          target.dataset.name,
        );
        break;
    }
  }

  myView.addEventListener('input', input, true);
  myView.addEventListener('click', input, true);

  myData['title'].addEventListener('keydown', function(e: KeyboardEvent) {
    if (e.keyCode === 13) {
      // enter
      e.preventDefault();
    }
  });

  function clearSelections() {
    Object.keys(myData).forEach(key => myData[key].blur());
    window.getSelection().removeAllRanges();
  }

  function setPublishedDisabledState(v: string) {
    if (v === '') {
      myData['published'].disabled = true;
    } else {
      myData['published'].disabled = false;
    }
  }
  app.add(myModel, {
    update_modified(key) {
      if (myKey !== key) return;
      myData['modified'].textContent =
        'Modified: ' + this.get(myKey, 'modified');
      setPublishedDisabledState(this.get(myKey, 'title'));
    },
    [myName + 'set'](key) {
      clearSelections();
      myKey = key;
      for (let name in myData) {
        let value = this.get(myKey, name);
        if (name === 'created' || name === 'modified') {
          value = name.charAt(0).toUpperCase() + name.slice(1) + ': ' + value;
          myData[name].innerHTML = value;
        } else if (name === 'published') {
          myData[name].checked = value;
          setPublishedDisabledState(this.get(myKey, 'title'));
        } else {
          myData[name].innerHTML = value;
        }
      }

      if (myView.classList.contains('hidden')) {
        myView.classList.remove('hidden');
        myEmpty.classList.add('hidden');
      }
    },
    [myName + 'clear']() {
      if (myView.classList.contains('hidden')) return;
      myView.classList.add('hidden');
      myEmpty.classList.remove('hidden');
      myKey = null;
      clearSelections();
    },
  });
}
