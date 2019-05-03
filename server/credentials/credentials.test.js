/* eslint-disable no-undef */
/* eslint-disable max-len */
const request = require('supertest-as-promised');
const httpStatus = require('http-status');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const app = require('../../app');
chai.config.includeStack = true;
const Project = require('../project/project.model');
const Credentials = require('./credentials.model');

before(function(done) {
    const fs = require('fs');
    const projectsFile = __dirname + '/test_data/projects.json';
    const credentialsFile = __dirname + '/test_data/credentials.json';
    const projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
    const credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
    Project.insertMany(projects)
        .then(() => Credentials.insertMany(credentials))
        .then(() => {
            done();
        });
});

describe('## Credentials', () => {
    describe('# GET /project/{projectId}/credentials/', () => {
        it('Should retrieve exiting credentials succesfully', done => {
            request(app)
                .get('/project/project_id_creds/credentials')
                .expect(httpStatus.OK)
                .then(res => {
                    expect(res.body).to.deep.equal({
                        socketio: {
                            session_persistence: true,
                        },
                    });
                    done();
                })
                .catch(done);
        });
    
        it('Should return 401 when project does not exist', done => {
            request(app)
                .get('/project/kkk/credentials')
                .expect(httpStatus.UNAUTHORIZED)
                .then(() => {
                    done();
                })
                .catch(done);
        });
    
        it('Should return 404 when project has no credentials', done => {
            request(app)
                .get('/project/project_without_creds/credentials')
                .expect(httpStatus.NOT_FOUND)
                .then(() => {
                    done();
                })
                .catch(done);
        });
    });
})
