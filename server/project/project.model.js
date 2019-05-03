const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const project = new Schema({ _id: String }, {strict: false});

module.exports = mongoose.model('Project', project, 'projects');