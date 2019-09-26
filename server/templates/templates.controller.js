const yaml = require('js-yaml');
const { body, validationResult, query } = require('express-validator/check');
const { addKeyToQuery } = require('../utils');
const { Projects } = require('../../models/models');

function subText(text, slots) {
    const slotSubs = Object.entries(slots).map(s => [`{${s[0]}}`, s[1] || '']);
    let subbedText = text;
    slotSubs.forEach(s => (subbedText = subbedText.replace(s[0], s[1])));
    return subbedText;
}

function formatSequence(t, templateKey, metadata = 0, slots = {}) {
    const doc = yaml.safeLoad(t.content);
    //TODO validate against schema https://github.com/nodeca/js-yaml/
    if (parseInt(metadata) !== 1) delete doc.metadata;
    if (typeof doc === 'object') return { ...doc, text: subText(doc.text, slots) };
    else if (typeof doc === 'string') return { text: subText(doc, slots) };
    else
        throw {
            error: 'wrong_message_format',
            code: 400,
        };
}

exports.responseByNameValidator = [
    // check('lang', 'must be a language code (e.g. "fr" or "en")')
    //     .isString().isLength({min: 2, max: 2}),
    // check('name', 'must start with \'utter_\'').matches(/^utter_/),
    query('metadata', 'must be 1 or 0 if set')
        .optional()
        .isBoolean(),
];
exports.nlgValidator = [
    // check('lang', 'must be a language code (e.g. "fr" or "en")')
    //     .isString().isLength({min: 2, max: 2}),
    // check('name', 'must start with \'utter_\'').matches(/^utter_/),
    // query('metadata', 'must be 1 or 0 if set').optional().isBoolean(),
    body('template', 'is required and must start with utter_')
        .isString()
        .custom(value => value.startsWith('utter_')),
    body(
        'arguments',
        'arguments should be an object and have a \'language\' property set to a language code',
    ).custom(value => value && value.language),
];

exports.nlg = async function(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { project_id: projectId } = req.params;
    const {
        template,
        arguments: { language },
        tracker: { slots },
    } = req.body;

    try {
        const project = await Projects.findOne(addKeyToQuery({ _id: projectId }, req))
            .select({ templates: { $elemMatch: { key: template } } })
            .lean()
            .exec();

        const responses = project.templates || [];
        if (!responses.length) throw { code: 404, error: 'not_found' };
        const localizedValue = responses[0].values.find(v => v.lang === language);
        if (!localizedValue || !localizedValue.sequence.length)
            throw {
                code: 404,
                error: 'not_found',
            };

        return res.status(200).json(
            localizedValue.sequence.map(t => {
                return formatSequence(t, template, 0, slots);
            }),
        );
    } catch (err) {
        return res.status(err.code || 500).json(err);
    }
};
exports.getResponseByName = async function(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { project_id: projectId, name: templateKey, lang } = req.params;
    const { metadata } = req.query;
    try {
        const project = await Projects.findOne(addKeyToQuery({ _id: projectId }, req))
            .select({ templates: { $elemMatch: { key: templateKey } } })
            .lean()
            .exec();

        const responses = project.templates || [];
        if (!responses.length) throw { code: 404, error: 'not_found' };
        const localizedValue = responses[0].values.find(v => v.lang === lang);
        if (!localizedValue || !localizedValue.sequence.length)
            throw {
                code: 404,
                error: 'not_found',
            };

        return res.status(200).json(
            localizedValue.sequence.map(t => {
                return formatSequence(t, templateKey, metadata);
            }),
        );
    } catch (err) {
        return res.status(err.code || 500).json(err);
    }
};

function prepareResponseAggregation(projectId, nlu) {
    const pipeline = [
        { $match: { _id: projectId } },
        { $unwind: '$templates' },
        { $unwind: '$templates.match.nlu' },
    ];

    // Select all responses with the following settings for the entity requested
    // - entity has value x
    // - entity is detetected
    const matchNLUStage = { 'templates.match.nlu.intent': nlu.intent };
    if (nlu.entities && nlu.entities.length > 0) {
        matchNLUStage.$and = [];
        nlu.entities.forEach(e => {
            const or = {
                $or: [
                    {
                        'templates.match.nlu.entities.entity': e.entity,
                        'templates.match.nlu.entities.value': { $exists: false },
                    },
                ],
            };
            if (e.value)
                or.$or.push({
                    'templates.match.nlu.entities.entity': e.entity,
                    'templates.match.nlu.entities.value': e.value,
                });
            matchNLUStage.$and.push(or);
        });
    }

    const entityLimiter = {};
    const entitiesLimit = nlu.entities && nlu.entities.length ? nlu.entities.length : 0;
    entityLimiter[`templates.match.nlu.entities.${entitiesLimit}`] = { $exists: false };
    pipeline.push({
        $match: {
            $and: [matchNLUStage, entityLimiter],
        },
    });

    // Add a field 'values' containing the count of entity values in that response
    pipeline.push({
        $project: {
            templates: 1,
            values: {
                $reduce: {
                    input: '$templates.match.nlu.entities',
                    initialValue: [],
                    in: {
                        $size: {
                            $concatArrays: ['$$value', '$templates.match.nlu.entities.value'],
                        },
                    },
                },
            },
        },
    });

    // Then sort and select the response with the highest value
    pipeline.push({ $sort: { values: -1 } });
    pipeline.push({
        $group: {
            _id: '$_id',
            templates: { $first: '$templates' },
        },
    });
    return pipeline;
}

exports.allResponsesValidator = [
    query('metadata', 'must be 1 or 0 if set')
        .optional()
        .isBoolean(),
    query('timestamp', 'must be in milliseconds if set')
        .optional()
        .isInt(),
];

exports.getAllResponses = async function(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { project_id: projectId } = req.params;
    const { timestamp, metadata } = req.query;
    try {
        const project = await Projects.findOne(addKeyToQuery({ _id: projectId }, req))
            .select({ templates: 1, responsesUpdatedAt: 1 })
            .lean()
            .exec();
        if (project.responsesUpdatedAt === parseInt(timestamp)) {
            return res.status(304).json();
        }
        project.templates = project.templates.map(template => {
            return {
                ...template,
                values: template.values.map(value => {
                    return {
                        ...value,
                        sequence: value.sequence.map(t =>
                            formatSequence(t, template.key, metadata),
                        ),
                    };
                }),
            };
        });
        return res.status(200).json({
            responses: project.templates,
            timestamp: project.responsesUpdatedAt,
        });
    } catch (err) {
        return res.status(err.code || 500).json(err);
    }
};
