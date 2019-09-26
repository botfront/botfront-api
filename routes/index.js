'use strict';
const express = require('express');
const {
    getResponseByName,
    responseByNameValidator,
    getResponseFromCriteria,
    responseFromCriteriaValidator,
    getAllResponses,
    allResponsesValidator,
    nlg,
    nlgValidator,
} = require('../server/bot_response/bot_response.controller')

const utteranceCtrl = require('../server/utterance/utterance.controller')
const { getSenderEventCount, insertConversation, updateConversation } = require('./conversations');
const { getProjectCredentials } = require('../server/credentials/credentials.controller');
const { getProjectEndpoints } = require('../server/endpoints/endpoints.controller');
const { getPublishedModels } = require('../server/models/model.controller');

let router = express.Router();

router.get('/project/:project_id/template/key/:name/lang/:lang',
    responseByNameValidator, getResponseByName);

router.get('/project/:project_id/response/name/:name/lang/:lang',
    responseByNameValidator, getResponseByName);

router.post('/project/:project_id/nlg',
    nlgValidator, nlg);

router.post('/project/:project_id/response',
    responseFromCriteriaValidator, getResponseFromCriteria);

router.get('/project/:project_id/responses',
    allResponsesValidator, getAllResponses);

router.get('/project/:project_id/conversations/:sender_id/:event_count', getSenderEventCount);
router.post('/project/:project_id/conversations/:sender_id/insert', insertConversation);
router.post('/project/:project_id/conversations/:sender_id/update', updateConversation);
router.get('/project/:project_id/credentials/:environment?/', getProjectCredentials);
router.get('/project/:project_id/endpoints/:environment?/', getProjectEndpoints);
router.get('/project/:project_id/models/published', getPublishedModels);
router.get('/health-check', (req, res) => res.status(200).json());
router.post('/log-utterance', utteranceCtrl.create);

module.exports = router;
