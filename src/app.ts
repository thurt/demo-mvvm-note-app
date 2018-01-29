import ViewModel = require('view-model');
import Post from './models/Post';
import Toolbar from './views/Toolbar';
import Detail from './views/Detail';
import List from './views/List';

const MyViewModel = ViewModel(true);
let toolbar_name = 'toolbar_';
let detail_name = 'detail_';

Post(MyViewModel)
  .then(model_name => {
    Toolbar(toolbar_name, model_name, MyViewModel);
    Detail(detail_name, model_name, MyViewModel);
    List(toolbar_name, detail_name, model_name, MyViewModel);
  })
  .catch(e => console.error(e));
