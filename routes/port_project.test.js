const request = require('supertest-as-promised');
const httpStatus = require('http-status');
const chai = require('chai');
const expect = chai.expect;
const app = require('../app');
const fs = require('fs');
chai.config.includeStack = true;
const { Projects } = require('../models/models');
const { allCollections } = require('./port_project');

const dbFile = __dirname + '/test_data/db.json';
const { projects, ...db } = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

const exportPayloads = [];
projects.forEach((project, index) => {
    exportPayloads.push({ project });
    Object.keys(db).forEach((col) => {
        exportPayloads[index][col] = [db[col][index]];
    })
});

before(async function() {
    await Projects.insertMany(projects);
    for (let key in db) {
        await allCollections[key].insertMany(db[key]);
    }
});

describe('## Export', () => {
    describe('# GET /project/{projectId}/export', () => {
        it('Should retrieve a project backup', (done) => {
            request(app)
                .get('/project/one/export')
                .expect(httpStatus.OK)
                .then((res) => {
                    const { timestamp, ...body } = res.body;
                    expect(timestamp).to.exist;
                    expect(body).to.deep.equal(exportPayloads[0]);
                    done();
                })
                .catch(done);
        });
    });
});

describe('## Import', () => {
    describe('# PUT /project/{projectId}/import', () => {
        it('Should reject invalid project backups', (done) => {
            request(app)
                .put('/project/one/import')
                .send({})
                .expect(httpStatus.UNPROCESSABLE_ENTITY)
                .then(() => done())
                .catch(done);
        });
        it('Should restore from a valid project backup', (done) => {
            request(app)
                .put('/project/one/import') // into project 'one'
                .send(exportPayloads[1]) // import backup of project 'two'
                .expect(httpStatus.OK)
                .then(async (res) => {
                    expect(res.text).to.be.equal('Success');
                    
                    const projectId = 'one'; // this one will stay
                    const projectName = 'one'; // this one will stay
                    let modelId = 'one'; // this one will change
                    let storyGroupId = 'one'; // this one will change

                    const {
                        _id: newProjectId,
                        name: newProjectName,
                        nlu_models: newNluModels,
                        ...newProject
                    } = await Projects.findOne({ _id: projectId }, {}).lean();
                    const {
                        _id: exportFileProjectId,
                        name: exportFileProjectName,
                        nlu_models: exportFileNluModels,
                        ...exportFileProject
                    } = { ...exportPayloads[1].project };
                    const storyGroup = await allCollections.storyGroups
                        .findOne({ _id: { $not: { $in: [storyGroupId] } } }, { _id: 1 }).lean();
                    const exportFileStoryGroupId = exportPayloads[1].storyGroups[0]._id;

                    modelId = newNluModels[0]; // remember modelId
                    storyGroupId = storyGroup._id; // remember storyGroupId

                    expect(newProjectId).to.be.equal(projectId); // project id didn't change
                    expect(newProjectName).to.be.equal(projectName); // project name didn't change
                    expect(modelId).to.not.be.equal('one'); // modelId changed...
                    expect(modelId).to.not.be.equal(exportFileNluModels[0]); // ...and yet is different from the one in backup
                    expect(storyGroupId).to.not.be.equal('one'); // storyGroupId changed...
                    expect(storyGroupId).to.not.be.equal(exportFileStoryGroupId); // ...and yet is different from the one in backup
                    expect(newProject).to.be.deep.equal(exportFileProject); // everything else in project is as in backup
                    
                    for (let col in allCollections) {
                        const {
                            projectId: docProjectId,
                            modelId: docModelId,
                            storyGroupId: docStoryGroupId,
                            ...doc
                        } = await allCollections[col].findOne({ $or: [
                            { projectId }, { modelId }, { _id: modelId },
                        ] }).lean();
                        const {
                            projectId: exportFileProjectId,
                            modelId: exportFileModelId,
                            storyGroupId: exportFileStoryGroupId,
                            ...exportFileDoc
                        } = { ...exportPayloads[1][col][0] };

                        expect(doc).to.exist; // able to find collection

                        if (col === 'models') expect(doc._id).to.be.equal(modelId); // modelId is as remembered
                        if (docModelId) expect(docModelId).to.be.equal(modelId); // modelId is as remembered
                        if (docProjectId) expect(docProjectId).to.be.equal(projectId); // projectId didn't change
                        if (docStoryGroupId) expect(docStoryGroupId).to.be.equal(storyGroupId); // storyGroupId is as remembered

                        delete doc._id; delete exportFileDoc._id;
                        expect(JSON.parse(JSON.stringify(
                            doc,
                        ))).to.be.deep.equal(exportFileDoc); // everything else is as in backup
                    }

                    done();
                })
                .catch(done);
        });
    });
});
