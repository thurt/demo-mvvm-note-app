import ViewModel = require('view-model');

export default function Detail(
  myName: string,
  myModel: string,
  app: ViewModel.Interface,
  simpleMDE: {
    value: (v: any) => any;
    codemirror: {on: (str: string, fn: (a: any) => void) => void};
  },
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

  myView.querySelector('[data-name="title"]').addEventListener(
    'input',
    function(e: Event) {
      e.stopPropagation();
      app.run(
        myModel,
        function(el) {
          this.update(myKey, {title: el.innerText});
        },
        e.target,
      );
    },
    true,
  );
  myView.querySelector('[data-name="published"]').addEventListener(
    'click',
    function(e: Event) {
      e.stopPropagation();
      app.run(
        myModel,
        function(el) {
          if (el instanceof HTMLInputElement) {
            this.update(myKey, {published: el.checked});
          }
        },
        e.target,
      );
    },
    true,
  );
  simpleMDE.codemirror.on('change', function() {
    app.run(myModel, function() {
      this.update(myKey, {body: simpleMDE.value(undefined)});
    });
  });

  let myKey: string = null;

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
      // make sure this is above simpleMDE.value() call because it will not render the MDE value correctly if it is not already visible
      if (myView.classList.contains('hidden')) {
        myView.classList.remove('hidden');
        myEmpty.classList.add('hidden');
      }
      for (let name in myData) {
        let value = this.get(myKey, name);
        if (name === 'created' || name === 'modified') {
          value = name.charAt(0).toUpperCase() + name.slice(1) + ': ' + value;
          myData[name].innerHTML = value;
        } else if (name === 'published') {
          myData[name].checked = value;
          setPublishedDisabledState(this.get(myKey, 'title'));
        } else if (name === 'title') {
          myData[name].innerHTML = value;
        } else if (name === 'body') {
          simpleMDE.value(value);
        }
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
