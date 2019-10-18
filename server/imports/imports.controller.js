const {
  Conversations,
  Projects,
  NLUModels,
  Activity
} = require("../../models/models");
const { getVerifiedProject } = require("../utils");

retreiveModelsIds = async function(projectId) {
  const { nlu_models: modelsIds } = await Projects.findOne({ _id: projectId })
    .select("nlu_models -_id")
    .lean()
    .exec();
  modelsAndLang = modelsIds.map(async modelId => {
    nluModel = NLUModels.findOne({ _id: modelId })
      .select("_id language")
      .lean()
      .exec();
    return nluModel;
  });
  return await Promise.all(modelsAndLang);
};

inferModelId = function(language, projectsAndModels) {
  const modelId = projectsAndModels.find(
    nluModel => nluModel.language === language
  );
  if (modelId) return modelId._id;
  return undefined;
};

addParseDataToActivity = async function(
  projectId,
  conversation,
  oldestImportTimestamp
) {
  const modelsOfProject = await retreiveModelsIds(projectId);
  let parseDataToAdd = [];
  let invalidParseData = [];
  conversation.tracker.events.forEach(event => {
    if (
      event.parse_data !== undefined &&
      event.parse_data.language !== undefined &&
      event.parse_data.text !== "" &&
      event.timestamp > oldestImportTimestamp
    ) {
      const { intent, entities, text } = event.parse_data;
      const modelId = inferModelId(event.parse_data.language, modelsOfProject);
      if (modelId) {
        parseDataToAdd.push({
          modelId: modelId,
          text: text,
          intent: intent.name,
          entities,
          confidence: intent.confidence,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        invalidParseData.push(event.parse_data);
      }
    }
  });
  return { parseDataToAdd, invalidParseData };
};

createConversationsToAdd = function(conversations, env, projectId) {
  const toAdd = [];
  const notValids = [];
  conversations.forEach(conversation => {
    if (conversation._id !== undefined) {
      toAdd.push({
        ...conversation,
        projectId,
        env,
        updatedAt: new Date(),
        createdAt: new Date(conversation.createdAt)
      });
    } else {
      notValids.push(conversation);
    }
  });

  return { toAdd, notValids };
};

exports.importConversation = async function(req, res) {
  const { conversations, processNlu } = req.body;
  const { project_id: projectId } = req.params;
  const project = await getVerifiedProject(projectId, req);
  try {
    if (!project) throw { code: 401, error: "unauthorized" };
    const { env } = req.params;
    // checks for parameters correctness
    if (!["production", "staging", "development"].includes(env)) {
      return res.status(400).json({
        error: "environement should be one of: production, staging, development"
      });
    }
    if (conversations === undefined || processNlu === undefined) {
      return res.status(400).json({
        error: "the body is missing conversations or processNlu, or both"
      });
    }
    if (!Array.isArray(conversations)) {
      return res
        .status(400)
        .json({ error: "conversations should be an array" });
    }

    if (typeof processNlu !== "boolean") {
      return res.status(400).json({ error: "processNlu should be an boolean" });
    }

    oldestImport = await getOldestTimeStamp(env);
    const { toAdd, notValids } = createConversationsToAdd(
      conversations,
      env,
      projectId
    );

    //delacred out of the forEach Block so it can be accessed later
    const invalidParseDatas = [];
    // add each prepared conversatin to the db, a promise all is used to ensure that all data is added before checking for errors
    errors = [];
    await Promise.all(
      toAdd.map(async conversation => {
        Conversations.updateOne(
          { _id: conversation._id },
          conversation,
          { upsert: true },
          function(err) {
            if (err) errors.push(err);
          }
        );
        if (processNlu) {
          const {
            parseDataToAdd,
            invalidParseData
          } = await addParseDataToActivity(
            projectId,
            conversation,
            oldestImport
          );
          if (parseDataToAdd && parseDataToAdd.length > 0) {
            await Activity.insertMany(parseDataToAdd, function(err) {
              if (err) errors.push(err);
            });
          }
          if (invalidParseData && invalidParseData.length > 0)
            invalidParseDatas.push(invalidParseData);
        }
      })
    );

    if (errors.length > 0) {
      return res.status(500).json(errors);
    }
    //create a report of the errors, if any
    const formatsError = {};
    if (notValids && notValids.length > 0) {
      formatsError.messageConversation =
        "some conversation were not added, the field _id is missing";
      formatsError.notValids = notValids;
    }
    if (invalidParseDatas.length > 0) {
      formatsError.messageParseData =
        "Some parseData have not been added to activity, the corresponding models could not be found";
      formatsError.invalidParseDatas = invalidParseDatas;
    }
    //object not empty
    if (Object.keys(formatsError).length !== 0) {
      return res.status(206).json(formatsError);
    }

    return res
      .status(200)
      .json({ message: "successfuly imported all conversations" });
  } catch (err) {
    return res.status(err.code || 500).json(err);
  }
};

getOldestTimeStamp = async function(env) {
  const lastestAddition = await Conversations.findOne({ env: env })
    .select("updatedAt")
    .sort("-updatedAt")
    .lean()
    .exec();
  if (lastestAddition) return Math.floor(lastestAddition.updatedAt / 1000);
  return 0;
};

exports.lastestImport = async function(req, res) {
  const { project_id: projectId } = req.params;
  const { env } = req.params;
  try {
    const project = await getVerifiedProject(projectId, req);
    if (!project) throw { code: 401, error: "unauthorized" };
    // checks for parameters correctness
    if (!["production", "staging", "development"].includes(env)) {
      return res.status(400).json({
        error: "environement should be one of: production, staging, development"
      });
    }
    const oldest = await getOldestTimeStamp(env);
    return res.status(200).json({ timestamp: oldest });
  } catch (err) {
    return res.status(err.code || 500).json(err);
  }
};
