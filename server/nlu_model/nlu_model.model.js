const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const nlu_model = new Schema({ _id: String }, { strict: false });

module.exports = mongoose.model('NLUModel', nlu_model, 'nlu_models');
