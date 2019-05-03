const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const nluModel = new Schema(
    { _id: { type: String, required: true } },
);
module.exports = mongoose.model('NLUModel', nluModel, 'nlu_models');