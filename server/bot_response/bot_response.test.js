/* eslint-disable no-undef */
/* eslint-disable max-len */
const request = require('supertest-as-promised');
const httpStatus = require('http-status');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const app = require('../../app');
chai.config.includeStack = true;
const Project = require('../project/project.model');

before(function(done) {
    const fs = require('fs');
    const projectsFile = __dirname + '/test_data/projects.json';
    const projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
    Project.insertMany(projects).then(function() {
        done();
    });
});

describe('## Bot responses API', () => {
    describe('# GET /project/{projectId}/response/{name}/lang/{lang}', () => {
        it('should succeed retrieving existing key', done => {
            request(app)
                .get('/project/5CmYdmu2Aanva3ZAy/response/name/utter_english_only/lang/en')
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body).to.deep.equal([{
                        'text': 'English only',
                    }]);
                    done();
                })
                .catch(done);
        });

        it('should return correct error when language not found', done => {
            request(app)
                .get('/project/5CmYdmu2Aanva3ZAy/response/name/utter_english_only/lang/fr')
                .expect(httpStatus.NOT_FOUND)
                .then(res => {
                    expect(res.body.error).to.equal('not_found');
                    done();
                })
                .catch(done);
        });

        it('should only retrieve values for the given language EN', done => {
            request(app)
                .get('/project/5CmYdmu2Aanva3ZAy/response/name/utter_english_french/lang/en')
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body).to.deep.equal([{
                        'text': 'English message',
                    }]);
                    done();
                })
                .catch(done);
        });

        it('should only retrieve values for the given language FR', done => {
            request(app)
                .get('/project/5CmYdmu2Aanva3ZAy/response/name/utter_english_french/lang/fr')
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body).to.deep.equal([{
                        'text': 'French message',
                    }]);
                    done();
                })
                .catch(done);
        });

        it('should return not found when name does not exist', done => {
            request(app)
                .get('/project/5CmYdmu2Aanva3ZAy/response/name/utter_does_not_exist/lang/fr')
                .expect(httpStatus.NOT_FOUND)
                .then(res => {
                    expect(res.body.error).to.equal('not_found');
                    done();
                })
                .catch(done);
        });

        it('should return not found when no templates', done => {
            request(app)
                .get('/project/no_templates/response/name/utter_does_not_exist/lang/fr')
                .expect(httpStatus.NOT_FOUND)
                .then(res => {
                    expect(res.body.error).to.equal('not_found');
                    done();
                })
                .catch(done);
        });

        it('should return not found when empty templates', done => {
            request(app)
                .get('/project/empty_templates/response/name/utter_does_not_exist/lang/fr')
                .expect(httpStatus.NOT_FOUND)
                .then(res => {
                    expect(res.body.error).to.equal('not_found');
                    done();
                })
                .catch(done);
        });

        it('should return not found when receiving empty sequences', done => {
            request(app)
                .get('/project/empty_sequence/response/name/utter_empty_sequence/lang/fr')
                .expect(httpStatus.NOT_FOUND)
                .then(res => {
                    expect(res.body.error).to.equal('not_found');
                    done();
                })
                .catch(done);
        });

        it('should not return metadata when no metadata in query', done => {
            request(app)
                .get('/project/5CmYdmu2Aanva3ZAy/response/name/utter_intent4_GKt4zV0Ezs/lang/en')
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body[0].text).to.equal('simple text message');
                    expect(res.body[0].metadata).to.not.exist;
                    done();
                })
                .catch(done);
        });

        it('should return metadata when metadata in query', done => {
            request(app)
                .get('/project/5CmYdmu2Aanva3ZAy/response/name/utter_intent4_GKt4zV0Ezs/lang/en?metadata=1')
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body[0].text).to.equal('simple text message');
                    expect(res.body[0].metadata).to.deep.equal({ test: 'ok' });
                    done();
                })
                .catch(done);
        });

        // it('should return 422 when invalid response name', done => {
        //     request(app)
        //         .get('/project/empty_sequence/response/name/empty_sequence/lang/fr')
        //         .expect(httpStatus.UNPROCESSABLE_ENTITY)
        //         .then(res => {
        //             expect(res.body.error).to.equal('not_found');
        //             done();
        //         })
        //         .catch(done);
        // });

        // it('should return 422 when invalid language', done => {
        //     request(app)
        //         .get('/project/empty_sequence/response/name/utter_empty_sequence/lang/french')
        //         .expect(httpStatus.UNPROCESSABLE_ENTITY)
        //         .then(res => {
        //             expect(res.body.error).to.equal('not_found');
        //             done();
        //         })
        //         .catch(done);
        // });
    });

    describe('# POST /project/{projectId}/response/}', () => {

        it('should send 422 with an empty payload', done => {
            request(app)
                .post('/project/5CmYdmu2Aanva3ZAy/response')
                .send({})
                .expect(httpStatus.UNPROCESSABLE_ENTITY)
                .then(() => { done() })
                .catch(done);
        });

        it('should succeed retrieving bot response with an intent', done => {
            request(app)
                .post('/project/5CmYdmu2Aanva3ZAy/response')
                .send({ nlu: { intent: 'intent1' }})
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body.key).to.equal('utter_intent1_p3vE6O_XsT');
                    done();
                })
                .catch(done);
        });

        it('should succeed retrieving bot response with an intent', done => {
            request(app)
                .post('/project/5CmYdmu2Aanva3ZAy/response')
                .send({ nlu: { intent: 'intent2' }})
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body.key).to.equal('utter_intent2_Laag5aDZv2');
                    done();
                })
                .catch(done);
        });

        it('should succeed retrieving bot response with an intent', done => {
            request(app)
                .post('/project/5CmYdmu2Aanva3ZAy/response')
                .send({ nlu: { intent: 'intent3' }})
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body.key).to.equal('utter_intent2_Kiioi89');
                    done();
                })
                .catch(done);
        });

        it('should succeed retrieving bot response with an intent and an entity without value', done => {
            request(app)
                .post('/project/5CmYdmu2Aanva3ZAy/response')
                .send({ nlu: { intent: 'intent1', entities: [ {entity: 'entity1', value:'not_in_responses'} ] }})
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body.key).to.equal('utter_intent2_Laag5aDZv2');
                    done();
                })
                .catch(done);
        });

        it('should succeed retrieving bot response with an intent and an entity with value', done => {
            request(app)
                .post('/project/5CmYdmu2Aanva3ZAy/response')
                .send({ nlu: { intent: 'intent1', entities: [ {entity: 'entity1', value: 'value1'} ] }})
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body.key).to.equal('utter_intent2_Jkk8jj9');
                    done();
                })
                .catch(done);
        });

        it('should succeed retrieving bot response with an intent with language', done => {
            request(app)
                .post('/project/5CmYdmu2Aanva3ZAy/response')
                .send({ language: 'en', nlu: { intent: 'intent4' }})
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body.sequence[0].text).to.equal('simple text message');
                    expect(res.body.sequence[0].metadata).to.not.exist;
                    done();
                })
                .catch(done);
        });

        it('should succeed retrieving bot response with an intent with language and metadata', done => {
            request(app)
                .post('/project/5CmYdmu2Aanva3ZAy/response?metadata=1')
                .send({ language: 'en', nlu: { intent: 'intent4' }})
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body.sequence[0].text).to.equal('simple text message');
                    expect(res.body.sequence[0].metadata).to.deep.equal({ test: 'ok' });
                    done();
                })
                .catch(done);
        });

        it('should return a 404 when a response exists but no content in the provided language', done => {
            request(app)
                .post('/project/5CmYdmu2Aanva3ZAy/response?metadata=1')
                .send({ language: 'de', nlu: { intent: 'intent4' }})
                .expect(httpStatus.NOT_FOUND)
                .then(() => { done() })
                .catch(done);
        });

        it('compact should return a compact sequence', done => {
            request(app)
                .post('/project/5CmYdmu2Aanva3ZAy/response?metadata=1')
                .send({ compact: true, language: 'en', nlu: { intent: 'intent4' }})
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body[0].text).to.equal('simple text message');
                    done();
                })
                .catch(done);
        });
    });
    describe('# GET /project/{projectId}/responses/', function() {

        it('should get all responses', function (done) {
            Project.findOne({ _id: '5CmYdmu2Aanva3ZAy'})
                .then(project => {
                    request(app)
                        .get('/project/5CmYdmu2Aanva3ZAy/responses')
                        .expect(httpStatus.OK)
                        .then(res => {
                            expect(res.body.responses)
                                .to.have.length(project.toObject().templates.length);
                            done()
                        })
                        .catch(done);
                })
            
        });
        it('should return 422 when invalid timestamp', done => {
            request(app)
                .get('/project/5CmYdmu2Aanva3ZAy/responses?timestamp=abc')
                .expect(httpStatus.UNPROCESSABLE_ENTITY)
                .then(() => { done(); })
                .catch(done);
        });

        it('should return 304 when timestamp corresponse to latest modification', done => {
            request(app)
                .get('/project/5CmYdmu2Aanva3ZAy/responses?timestamp=1551898048541')
                .expect(httpStatus.NOT_MODIFIED)
                .then(() => { done(); })
                .catch(done);
        });
    });
});
