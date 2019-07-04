const Model = require('../nlu_model/model')
const Utterance = require('./utterance.model')

async function create(req, res) {
    try {
        const model = await Model.findOne({ _id: req.body.modelId }, { _id: 1 });
        if (!model) throw { error: 'An existing modelId is required' };
        const { modelId, text } = req.body;
        const existingExample = await Utterance.findOne({ modelId, text }, { _id: 1 });

        let utterance = { ...new Utterance(req.body) };
        if (existingExample) delete utterance._doc._id;
        
        Utterance.findOneAndUpdate({ modelId, text }, utterance._doc, { upsert: true },
            (err) => {
                if (err) return res.status(400).json({
                    error: `${err.name} (${err.codeName}): ${err.errmsg}`,
                });
                return res.status(200).json(`Logged '${text}'`);
            });

    } catch (err) {
        res.status(400).json({ error: `${err.name} (${err.codeName}): ${err.errmsg}` });
    }
}

module.exports = { create };