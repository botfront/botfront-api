const request = require('supertest-as-promised');
const httpStatus = require('http-status');
const chai = require('chai');
const expect = chai.expect;
const app = require('../../app');
chai.config.includeStack = true;
const { Projects, NLUModels, Conversations } = require('../../models/models');

function dateParser(key, value) {
  if (key === 'updatedAt' || key === 'createdAt') {
    return new Date(value * 1000);
  }
  return value;
}
before(function(done) {
  const fs = require('fs');
  const projectsFile = __dirname + '/test_data/projects.json';
  const modelsFile = __dirname + '/test_data/nluModels.json';
  const conversationFile = __dirname + '/test_data/conversations.json';
  const projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
  const models = JSON.parse(fs.readFileSync(modelsFile, 'utf8'));
  const conversation = JSON.parse(
    fs.readFileSync(conversationFile, 'utf8'),
    dateParser
  );
  Projects.insertMany(projects)
    .then(() => NLUModels.insertMany(models))
    .then(() => Conversations.insertMany(conversation))
    .then(() => {
      done();
    });
});

describe('## last import', () => {
  describe('# GET /conversations/environment/{env}/latest-imported-event', () => {
    it('Should retrieve last import in production', done => {
      request(app)
        .get('/conversations/environment/production/latest-imported-event')
        .expect(httpStatus.OK)
        .then(res => {
          expect(res.body).to.deep.equal({
            timestamp: 1550000000
          });
          done();
        })
        .catch(done);
    });

    it('Should give 0 as no import yet in staging', done => {
      request(app)
        .get('/conversations/environment/staging/latest-imported-event')
        .expect(httpStatus.OK)
        .then(res => {
          expect(res.body).to.deep.equal({
            timestamp: 0
          });
          done();
        })
        .catch(done);
    });

    it('Should retrieve last import in developement', done => {
      request(app)
        .get('/conversations/environment/developement/latest-imported-event')
        .expect(httpStatus.OK)
        .then(res => {
          expect(res.body).to.deep.equal({
            timestamp: 1450000000
          });
          done();
        })
        .catch(done);
    });

    it('Should return 400 when envirnonement does not exist', done => {
      request(app)
        .get('/conversations/environment/prodduction/latest-imported-event')
        .expect(httpStatus.BAD_REQUEST)
        .then(res => {
          expect(res.body).to.deep.equal({
            error:
              'environement should be one of: production, staging, developement'
          });
          done();
        })
        .catch(done);
    });
  });
});
