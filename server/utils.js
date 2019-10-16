const db = require('monk')(process.env.MONGO_URL);
const {
    Projects,
} = require('../models/models');

const isRequestTrusted = req => {
    // This indicates the request comes from within the cluster so we trust it and no auth is needed
    return (
        (process.env.K8S_NAMESPACE && process.env.K8S_NAMESPACE.matches(req.hostname)) ||
        req.hostname === 'localhost' || req.hostname === '127.0.0.1' || process.env.DISABLE_API_KEY
    );
};

const addKeyToQuery = (q, req) => {
    const { query: { key: apiKey = 'no-api-key' } = {} } = req;
    return { ...q, apiKey };
};

/**
 * Finds the project corresponding to the API key provided in req
 * (if request is not coming from a trusted place)
 */
exports.getVerifiedProject = function(projectId, req, projection) {
    const selection = projection ? { _id: 1, ...projection } : null;
    if (isRequestTrusted(req)) {
        return Projects.findOne({ _id: projectId }, selection).lean();
    }
    return Projects.findOne(addKeyToQuery({ _id: projectId }, req), selection).lean();
};

/*
 * Required for converations/trackers until they are migrated to Mongoose
 */
exports.checkApiKeyAgainstProject = (projectId, req) => {
    return new Promise((resolve, reject) => {
        if (isRequestTrusted(req)) return resolve();
        const projects = db.get('projects', { castIds: false });
        projects
            .findOne(addKeyToQuery({ _id: projectId }, req), {
                fields: { _id: 1 },
            })
            .then(project => {
                if (!project) throw { code: 403, message: 'Unauthorized' };
                resolve(project);
            })
            .catch(reject);
    });
};

exports.isRequestTrusted = isRequestTrusted;
