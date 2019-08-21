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
    const responseBody = {
        status: 200,
        results: []
    };

    let promises = [];
    let requestOptions = [];
    let failedRequests = [];

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

        requestOptions.push(options);


        //request throws error if requests fails (503), to avoid failing all requests if one fails, catch the error and return it
        promises.push(rp(options).catch(error => {
            return new Promise(resolve => resolve(error))
        }));
    }

    // make all the requests
    Promise.all(promises).then(responses => {
        for (let i = 0; i < responses.length; i++) {
            let {body, statusCode} = responses[i];

            if (statusCode !== 200) {
                responseBody.status = 503;
                failedRequests.push(i); //capture the index of the failed request, so you can retry later
                continue;
            }

            if (!body) {
                continue;
            }

            let id = payload[i][idField];
            responseBody.results.push({...body, [idField]: id});
        }

        if (failedRequests.length === 0) {
            return res.send(responseBody);
        }


        console.log("retrying some", failedRequests);
        // map the indices of the failed requests to the correct req options object, and then to the promise that makes tha actual req
        const retryPromises = failedRequests
            .map(index => requestOptions[index])
            .map(options => rp(options).catch(error => {
                return new Promise(resolve => resolve(error))
            }));


        responseBody.status = 200;

        // retry...
        Promise.all(retryPromises).then(responses => {
            for (let i = 0; i < responses.length; i++) {
                let {body, statusCode} = responses[i];

                if (statusCode !== 200) {
                    responseBody.status = 503;
                    continue;
                }

                if (!body) {
                    continue;
                }

                const originalIndex = failedRequests[i];
                let id = payload[originalIndex][idField];
                responseBody.results[originalIndex] = {...body, [idField]: id};
            }

            res.send(responseBody);
        });
    });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))