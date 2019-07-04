const mongoose = require('mongoose');
const shortid = require('shortid');
const Schema = mongoose.Schema;

const entity = new Schema(
    {
        start: { type: Number, required: true },
        end: { type: Number, required: true },
        value: { type: String, required: true },
        entity: { type: String, required: true },
        confidence: { type: Number, required: false },
        extractor: { type: String, required: false },
        processors: [{ type: String, required: false }],
    },
    { _id: false },
);

const utterance = new Schema(
    {
        _id: { type: String, default: shortid.generate },
        modelId: { type: String, required: true },
        text: { type: String, required: true },
        intent: { type: String, required: false },
        entities: { type: [entity], required: false },
        confidence: { type: Number, required: true },
        validated: { type: Boolean, required: false },
        ooS: { type: Boolean, required: false },
        createdAt: { type: Date, required: true, default: Date.now },
        updatedAt: { type: Date, required: true, default: Date.now },
    },
)

utterance.pre('save', function(next) {
    if (this.entities){
        this.entities = this.entities.filter(e => e.extractor !== 'ner_duckling_http')
    }
    next();
})
module.exports = mongoose.model('Utterance', utterance, 'activity');
