const {
  Conversations,
  Projects,
  NLUModels,
  Activity
} = require('../../models/models');

retreiveProjectsAndModelsIds = async function() {
  const projects = await Projects.find({})
    .select('nlu_models _id')
    .lean()
    .exec();

  projectAndModels = projects.map(async project => {
    nluModels = await project.nlu_models.map(async projectNluModel => {
      nluModel = NLUModels.findOne({ _id: projectNluModel })
        .select('_id language')
        .lean()
        .exec();
      return nluModel;
    });
    nluModels = await Promise.all(nluModels);
    return { projectId: project._id, nluModels: nluModels };
  });
  return await Promise.all(projectAndModels);
};

inferModelId = function(projectId, language, projectsAndModels) {
  const project = projectsAndModels.find(
    projectAndModels => projectAndModels.projectId === projectId
  );
  const modelId = project.nluModels.find(
    nluModel => nluModel.language === language
  );
  return modelId._id;
};

addParseDataToActivity = async function(conversation, oldestImportTimestamp) {
  const projectsAndModels = await retreiveProjectsAndModelsIds();
  let parseDataToAdd = [];
  const projectId = conversation.projectId;
  conversation.tracker.events.forEach(event => {
    if (
      event.parse_data !== undefined &&
      event.parse_data.language !== undefined &&
      event.timestamp > oldestImportTimestamp
    ) {
      const { intent, entities, text } = event.parse_data;
      const modelId = inferModelId(
        projectId,
        event.parse_data.language,
        projectsAndModels
      );
      parseDataToAdd.push({
        modelId,
        text,
        intent: intent.name,
        entities,
        confidence: intent.confidence,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  });
  Activity.insertMany(parseDataToAdd);
};

exports.importConversation = async function(req, res) {
  const { conversations, processNlu } = req.body;
  const { env } = req.params;
  // checks for parameters correctness
  if (!['production', 'stagging', 'developement'].includes(env)) {
    return res.status(400).json({
      error: 'environement should be one of: production, stagging, developement'
    });
  }
  if (!Array.isArray(conversations)) {
    return res.status(400).json({ error: 'conversations should be an array' });
  }

  if (typeof processNlu !== 'boolean') {
    return res.status(400).json({ error: 'processNlu should be an boolean' });
  }

  let projectIds = await Projects.find({})
    .select('_id')
    .exec();
  projectIds = projectIds.map(project => project._id);

  let notAdded = [];
  oldestImport = await getOldestTimeStamp(env);

  conversations.forEach(conversation => {
    if (
      conversation._id !== undefined &&
      projectIds.includes(conversation.projectId)
    ) {
      Conversations.updateOne(
        { _id: conversation._id },
        {
          ...conversation,
          env,
          updatedAt: new Date(),
          createdAt: new Date(conversation.createdAt)
        },
        { upsert: true },
        function(err) {
          if (err) return res.status(400).json(err);
        }
      );
      if (processNlu) addParseDataToActivity(conversation, oldestImport);
    } else {
      notAdded.push(conversation);
    }
  });
  if (notAdded.length > 0)
    return res.status(206).json({
      message:
        'some conversation were not added, either the _id is missing or projectId does not exist',
      notAdded
    });
  return res
    .status(200)
    .json({ message: 'successfuly imported all conversations' });
};

getOldestTimeStamp = async function(env) {
  const lastestAddition = await Conversations.findOne({ env: env })
    .select('updatedAt')
    .sort('-updatedAt')
    .lean()
    .exec();
  if (lastestAddition) return Math.floor(lastestAddition.updatedAt / 1000);
  return 0;
};

exports.lastestImport = async function(req, res) {
  const { env } = req.params;
  // checks for parameters correctness
  if (!['production', 'stagging', 'developement'].includes(env)) {
    return res.status(400).json({
      error: 'environement should be one of: production, stagging, developement'
    });
  }
  const oldest = await getOldestTimeStamp(env);
  return res.status(200).json({ timestamp: oldest });
};
