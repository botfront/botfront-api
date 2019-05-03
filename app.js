'use strict';
const mongoose = require('mongoose');
const expressWinston = require('express-winston');
const winston = require('winston');
const config = require('./config/config');
const express = require('express');
const bodyParser = require('body-parser');

const port = process.env.PORT || 8080;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

config()
    .then(config => {
        const routes = require('./routes/index.js');
        app.use('/', routes);
        // Setup swagger UI
        require('./config/swagger')(app);

        app.use(expressWinston.logger({
            transports: [
                new winston.transports.Console(),
            ],
        }));
        mongoose.connect(config.mongo.host, { server: { socketOptions: { keepAlive: 1 } } });
        mongoose.connection.on('error', () => {
            throw new Error(`unable to connect to database: ${config.mongo.host}`);
        });

        app.listen(port, function() {
            // eslint-disable-next-line no-console
            return console.log('Server running at http://127.0.0.1:' + port);
        });
        app.config = config;
    })
    
module.exports = app;