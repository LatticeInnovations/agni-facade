module.exports = function (allowedRoles) {
  return function (req, res, next) {
    let userType = req.token?.type || req.token?.role;
    if (allowedRoles.includes(userType)) {
      next();
    } else {
      return res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
    }
  };
};
