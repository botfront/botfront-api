/* eslint-disable no-undef */
/* eslint-disable max-len */
const request = require('supertest-as-promised');
const httpStatus = require('http-status');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const app = require('../../app');
chai.config.includeStack = true;
const Project = require('../project/project.model');
const Endpoints = require('./endpoints.model');

before(function(done) {
    const fs = require('fs');
    const projectsFile = __dirname + '/test_data/projects.json';
    const endpointsFile = __dirname + '/test_data/endpoints.json';
    const projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
    const endpoints = JSON.parse(fs.readFileSync(endpointsFile, 'utf8'));
    Project.insertMany(projects)
        .then(() => Endpoints.insertMany(endpoints))
        .then(() => {
            done();
        });
});

describe('## Endpoints', () => {
    describe('# GET /project/{projectId}/endpoints/', () => {
        it('Should retrieve exiting endpoints succesfully', done => {
            request(app)
                .get('/project/project_id_endpoints/endpoints')
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body).to.deep.equal({
                        nlu: {
                            url: 'http://nlu',
                        },
                    });
                    done();
                })
                .catch(done);
        });
    
        it('Should return 401 when project does not exist', done => {
            request(app)
                .get('/project/kkk/endpoints')
                .expect(httpStatus.UNAUTHORIZED)
                .then(() => {
                    done();
                })
                .catch(done);
        });
    
        it('Should return 404 when project has no endpoints', done => {
            request(app)
                .get('/project/project_without_endpoints/endpoints')
                .expect(httpStatus.NOT_FOUND)
                .then(() => {
                    done();
                })
                .catch(done);
        });
    });
});

