/* eslint-disable no-undef */
/* eslint-disable max-len */
const request = require('supertest-as-promised');
const httpStatus = require('http-status');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const app = require('../../app');
chai.config.includeStack = true;
const Project = require('../project/project.model');
const Rules = require('./rules.model');

before(function(done) {
    const fs = require('fs');
    const projectsFile = __dirname + '/test_data/projects.json';
    const rulesFile = __dirname + '/test_data/rules.json';
    const projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
    const rules = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));
    Project.insertMany(projects)
        .then(() => Rules.insertMany(rules))
        .then(() => {
            done();
        });
});

describe('## Rules', () => {
    describe('# GET /project/{projectId}/rules/', () => {
        it('Should retrieve exiting rules succesfully', done => {
            request(app)
                .get('/project/project_id_rules/rules')
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body).to.deep.equal({
                        intent_substitutions: [
                            {
                                intent: 'chitchat',
                                with: 'faq',
                            },
                        ],
                    });
                    done();
                })
                .catch(done);
        });

        it('Should return 401 when project does not exist', done => {
            request(app)
                .get('/project/kkk/rules')
                .expect(httpStatus.UNAUTHORIZED)
                .then(() => {
                    done();
                })
                .catch(done);
        });

        it('Should return 404 when project has no rules', done => {
            request(app)
                .get('/project/project_without_rules/rules')
                .expect(httpStatus.NOT_FOUND)
                .then(() => {
                    done();
                })
                .catch(done);
        });
    });
});
