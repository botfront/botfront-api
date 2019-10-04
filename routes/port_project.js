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
    Projects,
} = require('../models/models');
const { validationResult, body } = require('express-validator/check');
const { getVerifiedProject } = require('../server/utils');
const uuidv4 = require('uuid/v4');

const colsWithMID = {
    activity: Activity,
    evaluations: Evaluations,
};
const colsWithPID = {
    storyGroups: StoryGroups,
    stories: Stories,
    slots: Slots,
    instances: Instances,
    endpoints: Endpoints,
    credentials: Credentials,
    corePolicies: CorePolicies,
    conversations: Conversations,
};

const collections = { ...colsWithMID, ...colsWithPID };
const allCollections = { ...collections, models: NLUModels };
exports.allCollections = allCollections;

const nativizeProject = function(projectId, projectName, backup) {
    /*
        given a projectId and a backup, change all IDs of backup so as to avoid potential
        conflicts when importing to database.
    */
    const { project, ...nativizedBackup } = backup;

    // delete any metadata key (that's not a collection)
    Object.keys(nativizedBackup).forEach((col) => {
        if (!Object.keys(allCollections).includes(col)) delete nativizedBackup[col];
    });

    let nlu_models = project.nlu_models;

    if ('models' in nativizedBackup) {
        const modelMapping = {};
        nativizedBackup.models.forEach(m => Object.assign(modelMapping, { [m._id]: uuidv4() })); // generate mapping from old to new id
        nlu_models = nlu_models // apply mapping to nlu_models property of project
            .filter(id => !Object.keys(modelMapping).includes(id))
            .concat(Object.values(modelMapping));
        
        Object.keys(colsWithMID).filter(col => col in nativizedBackup) // apply mapping to collections whose docs have a modelId key
            .forEach((col) => {
                nativizedBackup[col] = nativizedBackup[col].map(c => ({ ...c, modelId: modelMapping[c.modelId] }));
            });
        
        // apply mapping to NLUModels collection
        nativizedBackup.models = nativizedBackup.models.map(m => ({ ...m, _id: modelMapping[m._id] }));
    }

    if ('storyGroups' in nativizedBackup && 'stories' in nativizedBackup) {
        const storyGroupMapping = {};
        nativizedBackup.storyGroups.forEach(m => Object.assign(storyGroupMapping, { [m._id]: uuidv4() })); // generate mapping from old to new id
        nativizedBackup.storyGroups = nativizedBackup.storyGroups.map(sg => ({ ...sg, _id: storyGroupMapping[sg._id] })); // apply to storygroups
        nativizedBackup.stories = nativizedBackup.stories.map(s => ({ ...s, storyGroupId: storyGroupMapping[s.storyGroupId] })); // apply to stories
    }

    nativizedBackup.project = { ...project, _id: projectId, name: projectName, nlu_models }; // change id of project

    Object.keys(colsWithPID).filter(col => col in nativizedBackup) // change projectId of every collection whose docs refer to it
        .forEach((col) => {
            nativizedBackup[col] = nativizedBackup[col].map(c => ({ ...c, projectId }));
        });

    Object.keys(nativizedBackup).forEach((col) => { // change id of every other doc
        if (!['project', 'models', 'storyGroups'].includes(col)) {
            nativizedBackup[col] = nativizedBackup[col].map(doc => ({ ...doc, _id: uuidv4() }));
        }
    })

    return nativizedBackup;
}

const overwriteCollection = async function(projectId, modelIds, collection, backup) {
    if (!(collection in backup)) return;
    const model = collection in colsWithMID ? colsWithMID[collection] : colsWithPID[collection];
    const filter = collection in colsWithMID
        ? { modelId: { $in: modelIds } }
        : { projectId };
    await model.deleteMany(filter).exec();
    await model.insertMany(backup[collection]);
}

exports.exportProjectValidator = [];

exports.exportProject = async function(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { project_id: projectId } = req.params;
    try {
        const project = await getVerifiedProject(projectId, req);
        const models = await NLUModels.find({ _id: { $in: project.nlu_models } }).lean();
        const response = { project, models };
        for (let col in colsWithMID) {
            response[col] = await colsWithMID[col].find({ modelId: { $in: project.nlu_models } }).lean();
        }
        for (let col in colsWithPID) {
            response[col] = await colsWithPID[col].find({ projectId }).lean();
        }
        response.timestamp = (new Date).getTime();
        return res.status(200).json(response);
    } catch (err) {
        return res.status(500).json(err);
    }
};

exports.importProjectValidator = [
    body('project', 'is required')
        .custom(project => project && [
            '_id', 'name', 'defaultLanguage', 'nlu_models', 'templates', 'instance',
        ].every(prop => Object.keys(project).includes(prop))),
    body('', `is required to include ${Object.keys(allCollections).join(', ')}`) // for now, require every collection to be found in backup
        .custom(body => body && Object.keys(allCollections).every(col => Object.keys(body).includes(col))),
];

exports.importProject = async function(req, res) {
    const { project_id: projectId } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    try {
        const project = await getVerifiedProject(projectId, req);
        if (!project) throw { code: 401, error: 'unauthorized' };
        const backup = nativizeProject(projectId, project.name, req.body);
        for (let col in collections) {
            await overwriteCollection(projectId, project.nlu_models, col, backup);
        }
        await NLUModels.deleteMany({ _id: { $in: project.nlu_models } }).exec();
        await Projects.deleteMany({ _id: projectId }).exec();
        await NLUModels.insertMany(backup.models);
        await Projects.insertMany([backup.project]);
        return res.status(200).send('Success');
    } catch (e) {
        console.log(e)
        return res.status(500).json(e);
    }
}
