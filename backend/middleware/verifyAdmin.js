const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const verifyAdmin = async (req, res, next) => {
  try {
    // 1) Try httpOnly cookie first (primary expected source)
    let token = req.cookies.adminToken;

    // 2) Fallback: Authorization Bearer header (for SPA localStorage use)
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
        code: "ADMIN_AUTH_REQUIRED",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired admin token",
        code: jwtError.name === "TokenExpiredError" ? "ADMIN_TOKEN_EXPIRED" : "ADMIN_TOKEN_INVALID",
      });
    }

    const admin = await Admin.findById(decoded.id).select(
      "-username -password -code"
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
        code: "ADMIN_NOT_FOUND",
      });
    }

    req.admin = admin;
    req.admin.role = "admin";
    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Admin verification failed",
      code: "ADMIN_VERIFICATION_ERROR",
    });
  }
};

module.exports = verifyAdmin;
