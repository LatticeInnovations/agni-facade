

sendSuccess = function(res, message, data) {
    res.status(200).json({
        success: 1,
        message: message,
        data: data
    })
}


sendError = function(res, message) {
    res.status(500).json({
        error: 1,
        message: message
    })
}

sendDBError = function(res, code) {
    if(code === 'ER_BAD_DB_ERROR') {
        res.status(504).json({
            error: 1,
            message: "Unable to connection to the DB."
        })
    }
    else {
        res.status(504).json({
            error: 1,
            message: "Unable to process. Please try again."
        })
    }

}

sendInvalidDataError = function(res, data) {
    res.status(422).json({
        error: 1,
        data: data
    })
}

sendNotExists = function(res, message) {
    res.status(200).json({
        success: 0,
        message: message
    })
}

sendAlreadyExists = function(res, message) {
    res.status(400).json({
        success: 0,
        message: message
    })
}

sendUnauthorizedError = function(res) {
    res.status(401).json({
        error: 1,
        message: "You are unauthorized to perform this operation."
    })
}

sendOTPAPIError = function(res, status, message) {
    res.status(status).json({
        error: status >= 400 ? 1 : 0    ,
        message: message
    })
}



module.exports = {sendSuccess, sendDBError, sendNotExists, sendInvalidDataError, sendUnauthorizedError, sendAlreadyExists, sendError, sendOTPAPIError} ;