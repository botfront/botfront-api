const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const endpoints = new Schema({ _id: String }, { strict: false });

module.exports = mongoose.model('Endpoints', endpoints, 'endpoints');
