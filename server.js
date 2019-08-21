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


    for (let record of payload) {
        const idField = url.match(regex)[1];
        const idValue = record[idField];

        const urlWithParams = url.replace(`{${idField}}`, idValue);

        const options = {
            json: true,
            method: verb.toUpperCase(),
            uri: urlWithParams,
            body: record
        };

        rp(options).then(body => {
            responseBody.results.push({...body, [idField]: idValue});

            console.log(responseBody);
        });
    }

    Promise.all()

    res.send(responseBody);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))