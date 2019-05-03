const { getVerifiedProject } = require('../utils');
const Credentials = require('./credentials.model');
const yaml = require('js-yaml');

exports.getProjectCredentials = async function(req, res) {
    const { project_id: projectId } = req.params;
    try {
        const project = await getVerifiedProject(projectId, req);
        if (!project) throw { code: 401, error: 'unauthorized' }
        const credentials = await Credentials.findOne({ projectId })
            .select({ credentials: 1 })
            .lean()
            .exec();
        if (!credentials) throw { code: 404, error: 'not_found' }
        const jsonCredentials = yaml.safeLoad(credentials.credentials);
        return res.status(200).json(jsonCredentials);
    } catch (err) {
        return res.status(err.code || 500).json(err);
    }
};
