var express = require("express");
var router = express.Router();
var multer = require("multer");

//define filepath to upload file using multer
var upload = multer({
    dest: "assets/uploads/user",
});


var logs = require("../controllers/callLogs.js");
var salesAuth = require("../controllers/salesForceAuth.js");

/*
 * Routes that can be accessed only by autheticated users
 */
// router.post("/login", auth.login);

/*Admin APIs*/

const adminApiUrl = "/api/v1";

//for salesforce auth
router.post(adminApiUrl + "/add-sales-force-account", salesAuth.addSalesForceAccount);
router.post(adminApiUrl + "/sales-force-login", salesAuth.salesForceLogin);

//for salesforce call logs
router.get(adminApiUrl + "/call-logs", logs.callLogs);



module.exports = router;