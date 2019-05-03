const { checkApiKeyAgainstProject } = require('../server/utils');
const db = require('monk')(process.env.MONGO_URL);

exports.postDialogue = function(req, res) {
    if (req.params.tag !== 'production' && req.params.tag !== 'development') {
        return res.status(400).json({
            error: 'tag must be either \'production\' or \'development\'',
        });
    }

    checkApiKeyAgainstProject(req.params.project_id, req)
        .then(() => {
            const dialogues = db.get('trackers', { castIds: false });
            dialogues.find({ _id: req.params.sender_id }).then(function(trackers) {
                if (trackers.length > 0) {
                    const latestEvent =
                        trackers[0].tracker.events[trackers[0].tracker.events.length - 1];
                    const newEvents = req.body.events.filter(function(e) {
                        return e.timestamp > latestEvent.timestamp;
                    });
                    dialogues
                        .update(
                            { _id: req.params.sender_id },
                            {
                                $push: {
                                    'tracker.events': {
                                        $each: newEvents,
                                    },
                                },
                                $set: { updatedAt: new Date() },
                            },
                        )
                        .then(function() {
                            return res.sendStatus(200);
                        })
                        .catch(function(error) {
                            res.status(400).json(error);
                        });
                } else {
                    //TODO enforce schema
                    dialogues
                        .insert({
                            _id: req.params.sender_id,
                            tracker: req.body,
                            status: 'new',
                            tag: req.params.tag,
                            projectId: req.params.project_id,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .then(() => res.sendStatus(200))
                        .catch(error => res.status(400).json(error));
                }
            });
        })
        .catch(error => res.status(error.code || 500).json(error));
};
