const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const rules = new Schema({ _id: String }, {strict: false});

module.exports = mongoose.model('Rules', rules, 'rules');