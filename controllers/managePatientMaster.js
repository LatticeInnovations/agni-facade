const { listPatients } = require("../services/managePatientMaster");

let getPatients = async function (req, res) {
  try {
    let { search, sort_by, order } = req.query;
    let offset = parseInt(req.query.offset ?? req.query._offset) || 0;
    let count = parseInt(req.query.count ?? req.query._count) || 10;
    let result = await listPatients({ search, sort_by, order, offset, count });
    return res.status(200).json({ status: 1, total: result.total, data: result.data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      status: 0,
      message: "Unable to process. Please try again.",
      error: e.response ? e.response.data : e.message
    });
  }
};

module.exports = { getPatients };
