var express = require("express");
var router = express.Router();
var multer = require("multer");

//define filepath to upload file using multer
var upload = multer({
    dest: "assets/uploads/user",
});


var logs = require("../controllers/callLogs.js");
var salesAuth = require("../controllers/salesForceAuth.js");
var cronApi = require("../controllers/cronJob.js");

/*
 * Routes that can be accessed only by autheticated users
 */
// router.post("/login", auth.login);

/*Admin APIs*/

const adminApiUrl = "/api/v1";

//for salesforce auth
router.post(adminApiUrl + "/add-sales-force-account", salesAuth.addSalesForceAccount);
// router.post(adminApiUrl + "/sales-force-login", salesAuth.salesForceLogin);
router.get(adminApiUrl + "/get-credentials", salesAuth.getCredentials);

//for salesforce call logs
// router.get(adminApiUrl + "/call-logs", logs.callLogs);
// router.get(adminApiUrl + "/transfer-logs", logs.transferLogs);
// router.get(adminApiUrl + "/lead-status", logs.leadStatus);


//for cronJob
// router.get(adminApiUrl + "/sync-call-logs", cronApi.syncCallLogs);


module.exports = router;