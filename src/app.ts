import ViewModel = require('view-model');
import Post from './models/Post';
import Toolbar from './views/Toolbar';
import Detail from './views/Detail';
import List from './views/List';

const MyViewModel = ViewModel(true);
let toolbar_name = 'toolbar_';
let detail_name = 'detail_';

declare global {
  interface Window {
    errorHandler: (e: Error | Response) => void;
  }
}

//@ts-ignore
const simplemde = new SimpleMDE({
  element: document.querySelector('textarea[data-name="body"]'),
  forceSync: true,
  toolbar: [
    'bold',
    'italic',
    'heading',
    '|',
    'quote',
    'unordered-list',
    'ordered-list',
    '|',
    'link',
    'image',
    '|',
    'preview',
    'guide',
  ],
  shortcuts: {
    toggleFullScreen: null,
    toggleSideBySide: null,
  },
});

Post(MyViewModel, window.errorHandler)
  .then(model_name => {
    Toolbar(toolbar_name, model_name, MyViewModel);
    Detail(detail_name, model_name, MyViewModel, simplemde);
    List(toolbar_name, detail_name, model_name, MyViewModel);
  })
  .catch(e => console.error(e));
