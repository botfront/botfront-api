const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const model = new Schema({ _id: String }, { strict: false });

module.exports = mongoose.model('Model', model, 'nlu_models');
