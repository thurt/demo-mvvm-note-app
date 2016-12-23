'use strict'
const app = require('view-model')(true)
module.exports = app

let toolbar_name = 'toolbar_'
let detail_name = 'detail_'
let model_name = require('./models/Note')()

require('./views/Toolbar')(toolbar_name, model_name)
require('./views/Detail')(detail_name, model_name)
require('./views/List')(toolbar_name, detail_name, model_name)