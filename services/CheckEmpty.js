let {check} = require
module.exports.checkEmptyData = (data) => {
    if(data && data != null && data != "") {
        return false;
    }
    else return true;
}
