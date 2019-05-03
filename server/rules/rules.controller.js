const { getVerifiedProject } = require('../utils');
const Rules = require('./rules.model');
const yaml = require('js-yaml');

exports.getProjectRules = async function(req, res) {
    const { project_id: projectId } = req.params;
    try {
        const project = await getVerifiedProject(projectId, req);
        if (!project) throw { code: 401, error: 'unauthorized' }
        const rules = await Rules.findOne({ projectId })
            .select({ rules: 1 })
            .lean()
            .exec()
        if (!rules) throw { code: 404, error: 'not_found' }
        const jsonRules = yaml.safeLoad(rules.rules);
        return res.status(200).json(jsonRules);
    } catch (err) {
        return res.status(err.code || 500).json(err);
    }
};
