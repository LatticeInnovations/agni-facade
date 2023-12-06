

let sendstatus = function(res, message, data) {
    res.status(200).json({
        status: 1,
        message: message,
        data: data
    })
}


let sendError = function(res, message) {
    res.status(500).json({
        error: 1,
        message: message
    })
}

let sendDBError = function(res, code) {
    if(code === 'ER_BAD_DB_ERROR') {
        res.status(504).json({
            error: 1,
            message: "Unable to connection to the DB."
        })
    }
    else {
        res.status(504).json({
            status: 0,
            message: "Unable to process. Please try again."
        })
    }

}

let sendInvalidDataError = function(res, data) {
    res.status(422).json({
        status: 0,
        data: data,
        message: "Invalid request data"
    })
}

let sendNotExists = function(res, message) {
    res.status(200).json({
        status: 0,
        message: message
    })
}

let sendAlreadyExists = function(res, message) {
    res.status(400).json({
        status: 0,
        message: message
    })
}

let sendUnauthorizedError = function(res) {
    res.status(401).json({
        error: 1,
        message: "You are unauthorized to perform this operation."
    })
}

let sendOTPAPIError = function(res, status, message) {
    res.status(status).json({
        error: status >= 400 ? 1 : 0    ,
        message: message
    })
}



module.exports = {sendstatus, sendDBError, sendNotExists, sendInvalidDataError, sendUnauthorizedError, sendAlreadyExists, sendError, sendOTPAPIError} ;