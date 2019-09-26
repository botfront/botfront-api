const {
    Activity,
    Conversations,
    CorePolicies,
    Instances,
    Slots,
    Stories,
    StoryGroups,
    Evaluations,
    NLUModels,
    Endpoints,
    Credentials,
} = require('../models/models');
const { validationResult } = require('express-validator/check');
const { getVerifiedProject } = require('../server/utils');

exports.exportProjectValidator = [];

exports.exportProject = async function(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { project_id: projectId } = req.params;
    try {
        const project = await getVerifiedProject(projectId, req);
        const models = await NLUModels.find({ _id: { $in: project.nlu_models } }).exec();
        const activity = await Activity.find({ modelId: { $in: project.nlu_models } }).exec();
        const evaluations = await Evaluations.find({ modelId: { $in: project.nlu_models } }).exec();
        const storyGroups = await StoryGroups.find({ projectId }).exec();
        const stories = await Stories.find({ projectId }).exec();
        const slots = await Slots.find({ projectId }).exec();
        const instances = await Instances.find({ projectId }).exec();
        const endpoints = await Endpoints.find({ projectId }).exec();
        const credentials = await Credentials.find({ projectId }).exec();
        const corePolicies = await CorePolicies.find({ projectId }).exec();
        const conversations = await Conversations.find({ projectId }).exec();
        
        return res.status(200).json({
            project, models, activity, evaluations, storyGroups, stories, slots, instances, endpoints, credentials, corePolicies, conversations,
        });
    } catch (err) {
        return res.status(500).json(err);
    }
};

exports.importProjectValidator = [];

exports.importProject = async function(req, res) {}
