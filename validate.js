const supported_verbs = ["GET", "POST", "PUT", "DELETE"];

const validate = req => {
    if (!req || !req.body) {
        return false;
    }

    let { verb, url, payload } = req.body;

    if (!verb) {
        return false;
    }

    if (!url) {
        return false;
    }

    if (!Array.isArray(payload)) {
        return false;
    }

    if (supported_verbs.indexOf(verb) === -1 ) {
        return false;
    }

    return true;
}

module.exports = (req, res, next) => {
    if (!validate(req)) {
        res.status(500).send('Something broke!')
    }

    return next();
}
