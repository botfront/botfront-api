const Model = require('../nlu_model/model');
const Utterance = require('./utterance.model');
const Project = require('../project/project.model');

async function logUtterance(modelId, parseData, callback) {
    const { text } = parseData;
    const existingExample = await Utterance.findOne({ modelId, text }, { _id: 1 });
    const newData = {
        ...parseData,
        intent: parseData.intent.name,
        confidence: parseData.intent.confidence,
    };
    let utterance = { ...new Utterance(newData) }._doc;
    if (!parseData.intent) utterance.intent = null;

    if (existingExample) delete utterance._id;
    if (utterance.entities) {
        utterance.entities = utterance.entities.filter(e => e.extractor !== 'ner_duckling_http');
    }

    Utterance.findOneAndUpdate(
        { modelId, text },
        utterance,
        {
            upsert: true,
            runValidators: true,
        },
        err => callback(utterance, err),
    );
}

async function create(req, res) {
    try {
        const model = await Model.findOne({ _id: req.body.modelId }, { _id: 1 });
        if (!model) throw new Error('An existing modelId is required');
        const { modelId, parse_data } = req.body;
        logUtterance(modelId, parse_data, (utterance, error) => {
            if (error) return res.status(400).json({ error: error.name });
            return res.status(200).json(utterance);
        });
    } catch (err) {
        res.status(400).json({ error: err.toString().replace(/.*Error: /, '') });
    }
}

const logUtterancesFromTracker = async function(projectId, req) {
    try {
        const userUtterances = req.body.events.filter(
            event => event.event === 'user' && event.text.indexOf('/') !== 0,
        );
        if (userUtterances.length) {
            // there should only be one event here, really
            const { language } = userUtterances[0].parse_data;
            const project = await Project.findOne({ _id: projectId }, { nlu_models: 1 }).lean();
            const model = await Model.findOne(
                {
                    language,
                    _id: { $in: project.nlu_models },
                },
                { _id: 1 },
            ).lean();
            userUtterances.forEach(u =>
                logUtterance(
                    model._id,
                    u.parse_data,
                    (_u, e) => e && console.log('Logging failed: ', e),
                ),
            );
        }
    } catch (e) {
        console.log('Logging failed: ', e);
    }
};

module.exports = { create, logUtterance, logUtterancesFromTracker };
