const Model = require('../nlu_model/model')
const Utterance = require('./utterance.model')

async function logUtterance(modelId, parseData, callback) {
    const { text } = parseData;
    const existingExample = await Utterance.findOne({ modelId, text }, { _id: 1 });
    let utterance = { ...new Utterance(parseData) }._doc;
    if (!parseData.intent) utterance.intent = null;
    
    if (existingExample) delete utterance._id;
    if (utterance.entities) {
        utterance.entities = utterance.entities.filter(
            e => e.extractor !== 'ner_duckling_http',
        );
    }
    
    Utterance.findOneAndUpdate({ modelId, text }, utterance, {
        upsert: true, runValidators: true,
    }, err => callback(utterance, err));
}

async function create(req, res) {
    try {
        const model = await Model.findOne({ _id: req.body.modelId }, { _id: 1 });
        if (!model) throw new Error('An existing modelId is required');
        const { modelId } = req.body;
        logUtterance(modelId, req.body, (utterance, error) => {
            if (error) return res.status(400).json({ error: error.name });
            return res.status(200).json(utterance);
        })
    } catch (err) {
        res.status(400).json({ error: err.toString().replace(/.*Error: /, '') });
    }
}

module.exports = { create, logUtterance };