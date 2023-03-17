let {check} = require
module.exports.checkEmptyData = (data) => {
    if(data && data != null && data != "" && typeof data !== "undefined") {
        return false;
    }
    else return true;
}
