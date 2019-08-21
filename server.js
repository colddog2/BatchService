const express = require('express')
const app = express()
const port = 3000

const validate = require("./validate");

bodyParser = require('body-parser');

// support parsing of application/json type post data
app.use(bodyParser.json());

app.post('/', validate, (req, res) => {


    const {url, verb, payload} = req.body;
    const regex = /{(.*)}/;
    for (let record of payload) {
        const idField = url.match(regex)[1];
        const idValue = record[idField];

        const urlWithParams = url.replace(`{${idField}}`, idValue);
        console.log(urlWithParams);
    }

    res.send("OK");
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))