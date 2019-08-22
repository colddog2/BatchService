"use strict"
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

    payload.forEach((record, i) => {

        const idValue = record[idField];

        const urlWithParams = url.replace(`{${idField}}`, idValue);

        const options = {
            json: true,
            method: verb.toUpperCase(),
            uri: urlWithParams,
            body: record, resolveWithFullResponse: true

        };

        const bucket = Math.floor(i/5);
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
            let {body, statusCode} = response;
            let id = payload[i + offset*5][idField];

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

    tasks.reduce((a, c, index) => {
        return a
            .then(() => Promise.all(c.map(f => f())))
            .then(updateResult.bind(null, index));
    }, Promise.resolve()).then(() => res.send(result));
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))