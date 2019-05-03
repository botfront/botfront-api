const Model = require('../nlu_model/model')
const Utterance = require('./utterance.model')

async function create(req, res) {
    try {
        const model = await Model.findOne({ _id: req.body.modelId }, { _id: 1 });
        if (!model) throw { error: 'An existing modelId is required' };
        const { modelId, text } = req.body;
        const existingExample = await Utterance.findOne({ modelId, text }, { _id: 1 });
        if (existingExample) throw {
            error: 'An example with that text already exists in the collection',
        };
           
        const utterance = new Utterance(req.body);
        const saveResult = await utterance.save();
        return res.status(200).json(saveResult);

    } catch (err) {
        res.status(400).json(err);
    }
}

module.exports = { create };