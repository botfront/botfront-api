const { getVerifiedProject } = require('../utils');
const Endpoints = require('./endpoints.model');
const yaml = require('js-yaml');

exports.getProjectEndpoints = async function(req, res) {
    const { project_id: projectId } = req.params;
    try {
        const project = await getVerifiedProject(projectId, req);
        if (!project) throw { code: 401, error: 'unauthorized' }
        const endpoints = await Endpoints.findOne({ projectId })
            .select({ endpoints: 1 })
            .lean()
            .exec();
        if (!endpoints) throw { code: 404, error: 'not_found' }
        const jsonEndpoints = yaml.safeLoad(endpoints.endpoints);
        return res.status(200).json(jsonEndpoints);
    } catch (err) {
        return res.status(err.code || 500).json(err);
    }
};
