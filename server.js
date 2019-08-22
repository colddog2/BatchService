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

    let promises = [];

    const idField = url.match(regex)[1];

    for (let record of payload) {
        const idValue = record[idField];

        const urlWithParams = url.replace(`{${idField}}`, idValue);

        const options = {
            json: true,
            method: verb.toUpperCase(),
            uri: urlWithParams,
            body: record, resolveWithFullResponse: true

        };

        //request throws error if requests fails (503), to avoid failing all requests if one fails, catch the error and return it
        promises.push(rp(options)
            .catch(() => rp(options))
            .catch(() => Promise.resolve({
                statusCode: 503
            })));
    }

    const result = {
        numSuccess: 0,
        failed: [],
        status: 200,
        results: []
    };

    Promise.all(promises)
        .then( responses => {
            responses.forEach( (response, i) => {
                let {body, statusCode} = response;
                let id = payload[i][idField];

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
        })
        .then(() => res.send(result));
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))