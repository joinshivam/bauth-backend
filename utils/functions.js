function throwError(message, field = "global", status = 400) {
    const err = new Error(message);
    err.field = field;
    err.status = status;
    throw err;
}

module.exports = {throwError};
