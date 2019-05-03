const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const credentials = new Schema({ _id: String }, {strict: false});

module.exports = mongoose.model('Credentials', credentials, 'credentials');