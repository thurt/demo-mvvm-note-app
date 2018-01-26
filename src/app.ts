import ViewModel = require('view-model');
import Note from './models/Note';
import Toolbar from './views/Toolbar';
import Detail from './views/Detail';
import List from './views/List';

const MyViewModel = ViewModel(true);
const model_name = Note(MyViewModel);

let toolbar_name = 'toolbar_';
let detail_name = 'detail_';

Toolbar(toolbar_name, model_name, MyViewModel);
Detail(detail_name, model_name, MyViewModel);
List(toolbar_name, detail_name, model_name, MyViewModel);
