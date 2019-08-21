const express = require('express');
const app = express();
const port = 3000;
var rp = require('request-promise');

const validate = require("./validate");

bodyParser = require('body-parser');

// support parsing of application/json type post data
app.use(bodyParser.json());

app.post('/', validate, (req, res) => {

    const {url, verb, payload} = req.body;
    const regex = /{(.*)}/;


    const responseBody = {
        status: 200,
        results: []
    };

    const promises = [];

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

        promises.push(rp(options).catch(error => {
            return new Promise(resolve => resolve(error))
        }));
    }

    Promise.all(promises).then(responses => {
        for (let i=0 ; i < responses.length; i++) {
            let { body, statusCode} = responses[i];

            if (statusCode !== 200) {
                responseBody.status = 503;
                continue;
            }

            if (!body) {
                continue;
            }

            let id = payload[i][idField];
            responseBody.results.push({...body, [idField] : id});
        }
        res.send(responseBody);

    }).catch(()=> {
        res.status(500).send({
            error: "bah"
        })
    });

});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))