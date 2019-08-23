"use strict";
const express = require('express');
const app = express();
const port = 3000;
const rp = require('request-promise');
const validate = require("./validate");

const bodyParser = require('body-parser');

// support parsing of application/json type post data
app.use(bodyParser.json());

app.post('/', validate, (req, res) => {

    const {url, verb, payload} = req.body;
    const regex = /{(.*)}/; // capture the path param of delegated request

    let tasks = [];
    const idField = url.match(regex)[1];
    const reqPerTasks = 5;
    payload.forEach((record, i) => {

        const idValue = record[idField];

        const urlWithParams = url.replace(`{${idField}}`, idValue);

        const options = {
            json: true,
            method: verb.toUpperCase(),
            uri: urlWithParams,
            body: record, resolveWithFullResponse: true

        };

        // create a tasks list, each task is an array of http requests
        const bucket = Math.floor(i/reqPerTasks);
        tasks[bucket] = tasks[bucket] || [];
        tasks[bucket].push(() => rp(options)
            .catch(() => rp(options))
            .catch(() => Promise.resolve({
                statusCode: 503
            }))
        );
    });

    const result = {
        numSuccess: 0,
        failed: [],
        status: 200,
        results: []
    };

    let updateResult = (offset, responses) => {
        responses.forEach((response, i) => {
            if (!response) {
                return;
            }

            let {body, statusCode} = response;
            let id = payload[i + offset*reqPerTasks][idField];

            if (statusCode !== 200) {
                result.status = statusCode;
                result.failed.push(id);
                return;
            }

            if (!body) {
                return;
            }

            result.numSuccess++;
            result.results.push({...body, [idField]: id});
        });
    };
    // promisify a sleep mechanism
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // run the tasks in sequence, i.e. perform the next task only when the prev completed
    tasks.reduce((a, c, index) => {

        // delay execution of next task
        if (index < tasks.length - 1) {
            c.push(() => delay(0));
        }
        return a
            .then(() => Promise.all(c.map(f => f())))
            .then(updateResult.bind(null, index))
    }, Promise.resolve()).then(() => res.send(result));
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))