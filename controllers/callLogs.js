const db = require('../models/index')
const { QueryTypes } = require('sequelize');
const { response } = require('express');
const request = require('request');
const jwt = require('jwt-simple');
const { Parser } = require('json2csv');
var fs = require('fs');
const { resolve } = require('path');
var newline = '\r\n';
const csvFile =require('csvtojson')


let logs = {

    callLogs: async function (tenantId) {
        try {
            let logs = await db.sequelize.query('select call_logs.duration as CallDurationInSeconds, call_logs.id as CallObject, call_logs.outcome as CallDisposition, contacts.crm_contact_id as WhoId, call_logs.due_date as ActivityDate from call_logs inner join key_contacts on call_logs.key_contact_id = key_contacts.id inner join contacts on key_contacts.contact_id = contacts.id inner join campaigns on key_contacts.campaign_id = campaigns.id where campaigns.tenant_id = :tenantId and sync = false limit 5000', {
                replacements: { tenantId: tenantId },
                type: QueryTypes.SELECT
            });
    
            let fields = ['CallDurationInSeconds','CallObject','CallDisposition','WhoId','ActivityDate'];
            const opts = {fields}

            const parser = new Parser(opts);
            const csv = parser.parse(logs);
            let lines = csv.replace(/\r\n?/g, "\n").split("\n");
            let csvData = "";
            lines.forEach(element => {
                csvData += element+newline;
            });

            let format = `--BOUNDARY`+newline+`Content-Type: application/json`+newline+`Content-Disposition: form-data; name="job"`+newline+newline+`{`+newline+`"object":"Task",`+newline+`"contentType":"CSV",`+newline+`"operation": "insert",`+newline+`"lineEnding": "CRLF"`+newline+`}`+newline+newline+`--BOUNDARY`+newline+`Content-Type: text/csv`+newline+`Content-Disposition: form-data; name="content"; filename="content"`+ newline + newline + csvData + '--BOUNDARY--';

            let auth = await salesForceLogin(tenantId);
            
            if(auth.access_token){
                let insertResponse = await bulkInsert(auth, format);
                let bulkInsertIds = await verifyBulkInsert(auth, insertResponse, tenantId);
                if(insertResponse.state == "UploadComplete")
                {
                    let insertIds = [];
                    bulkInsertIds.forEach(element => {
                        insertIds.push(element.CallObject);
                    });

                    if(insertIds[0]){
                        await db.sequelize.query('update call_logs SET sync = true, sf_insert_id = :sfInsertId where id IN (:insertIds)', {
                            replacements: {
                                insertIds:insertIds,
                                sfInsertId:insertResponse.id
                            }
                        });
                    }
                }
            }
            // return res.status(200).send(insertResponse);
        } catch (error) {
            console.log(error)
            return res.status(500).send(error);
        }
    },

    transferLogs: async function (tenantId) {
        try {
            let logs = await db.sequelize.query('select transfer_logs.call_duration as CallDurationInSeconds,transfer_logs.id as CallObject, contacts.crm_contact_id as WhoId from transfer_logs inner join key_contacts on transfer_logs.key_contact_id = key_contacts.id inner join contacts on key_contacts.contact_id = contacts.id inner join campaigns on key_contacts.campaign_id = campaigns.id where campaigns.tenant_id = :tenantId and sync = false limit 5000', {
                replacements: { tenantId: tenantId },
                type: QueryTypes.SELECT
            });

            // if (!logs[0]) { 
            //     return res.status(500).send({ message: 'Something went wrong' });
            // }

            let fields = ['CallDurationInSeconds','CallObject','WhoId'];
            const opts = {fields}

            const parser = new Parser(opts);
            const csv = parser.parse(logs);
            let lines = csv.replace(/\r\n?/g, "\n").split("\n");
            let csvData = "";
            lines.forEach(element => {
                csvData += element+newline;
            });
            let format = `--BOUNDARY`+newline+`Content-Type: application/json`+newline+`Content-Disposition: form-data; name="job"`+newline+newline+`{`+newline+`"object":"Task",`+newline+`"contentType":"CSV",`+newline+`"operation": "insert",`+newline+`"lineEnding": "CRLF"`+newline+`}`+newline+newline+`--BOUNDARY`+newline+`Content-Type: text/csv`+newline+`Content-Disposition: form-data; name="content"; filename="content"`+ newline + newline + csvData + '--BOUNDARY--';

            let auth = await salesForceLogin(tenantId);
            if(auth.access_token){
                let insertResponse = await bulkInsert(auth, format);
                let bulkInsertIds = await verifyBulkInsert(auth, insertResponse, tenantId);
                if(insertResponse.state == "UploadComplete")
                {
                    let insertIds = [];
                    bulkInsertIds.forEach(element => {
                        insertIds.push(element.CallObject);
                    });

                    if(insertIds[0]){
                        await db.sequelize.query('update transfer_logs SET sync = true, sf_insert_id = :sfInsertId where id IN (:insertIds)', {
                            replacements: {
                                insertIds:insertIds,
                                sfInsertId:insertResponse.id
                            }
                        });
                    }
                }
            }
            // return res.status(200).send(insertResponse);
        } catch (error) {
            console.log(error)
            return res.status(500).send(error);
        }
    },

//     leadStatus: async function (req, res) {
//         try {
//             let leadStatus = await db.sequelize.query('SELECT DISTINCT status FROM key_contacts',{
//                 type: QueryTypes.SELECT
//             });

//             if (!leadStatus[0]) {
//                 return res.status(500).send({ message: 'Something went wrong' });
//             }

//             let fields = ['Status'];
//             const opts = {fields}

//             const parser = new Parser(opts);
//             const csv = parser.parse(leadStatus);

//             let format = `--BOUNDARY`+newline+`Content-Type: application/json`+newline+`Content-Disposition: form-data; name="job"`+newline+newline+`{`+newline+`"object":"Lead",`+newline+`"contentType":"CSV",`+newline+`"operation": "insert",`+newline+`"lineEnding": "CRLF"`+newline+`}`+newline+newline+`--BOUNDARY`+newline+`Content-Type: text/csv`+newline+`Content-Disposition: form-data; name="content"; filename="content"`+ newline + newline + csv + newline + '--BOUNDARY--';

//             let auth = await salesForceLogin(req.query.tenantId);

//             var options = {
//                 'url': auth.instance_url+'/services/data/v52.0/jobs/ingest',
//                 'headers': {
//                     'Authorization': auth.token_type + ' ' + auth.access_token,
//                     'Content-Type' : 'multipart/form-data; boundary=BOUNDARY',
//                     'Accept': 'application/json'
//                 },
//                 body: format
//             };
//             request.post(options, function (error, response) {
//                 if (error) throw new Error(error);
//                 return res.status(200).send(response.body);
//             });
//         } catch (error) {
//             return res.status(500).send(error);
//         }
//     }
}

async function verifyBulkInsert(auth, insertResponse, tenantId){
    try {
        let options = {
            'method': 'get',
            'url': auth.instance_url+'/services/data/v52.0/jobs/ingest/' + insertResponse.id + '/successfulResults',
            'headers': {
                'Authorization': auth.token_type + ' ' + auth.access_token,
                'Content-Type' : 'application/json; charset=UTF-8',
                'Accept': 'text/csv'
            },
        };

        return new Promise(function (resolve, reject) {
            request(options, function (error, response) {
                if (error) throw new Error(error);
                fs.writeFile('csvFile'+tenantId+'.csv', response.body, function (err) {
                    if (err) throw err;
                    console.log('File is created successfully.');
                });
                csvFile()
                .fromFile('csvFile'+tenantId+'.csv')
                .then((jsonObj)=>{
                    return resolve(jsonObj);
                })
            });
        });
    } catch (error) {
        console.log(error)
    }
}


async function bulkInsert(auth,format){
    try {
        var options = {
            'url': auth.instance_url+'/services/data/v52.0/jobs/ingest',
            'headers': {
                'Authorization': auth.token_type + ' ' + auth.access_token,
                'Content-Type' : 'multipart/form-data; boundary=BOUNDARY',
                'Accept': 'application/json'
            },
            body: format
        };
        return new Promise(function (resolve, reject) {
            request.post(options, function (error, response) {
                if (error) throw new Error(error);
                return resolve(JSON.parse(response.body));
            });
        });
    } catch (error) {
        return res.status(500).send(error);
    }
}

async function salesForceLogin(tenantId) {
    try {
        let salesForceUser = await db.sequelize.query('select * from crm_integration where tenant_id = :tenantId limit 1', {
            replacements: { tenantId: tenantId },
            type: QueryTypes.SELECT
        });

        let decodedPassword = await decodePassword(salesForceUser[0].password);
        var options = {
            'method': 'post',
            'url': 'https://login.salesforce.com/services/oauth2/token',
            formData: {
                'username': salesForceUser[0].username,
                'password': decodedPassword.password,
                'grant_type': 'password',
                'client_id': salesForceUser[0].client_id,
                'client_secret': salesForceUser[0].client_secret
            }
        };

        return new Promise(function (resolve, reject) {
            request(options, function (error, response) {
                if (error) throw new Error(error);
                return resolve(JSON.parse(response.body));
            });
        });

    } catch (error) {
        console.log('here rr', error);
        return res.status(500).send(error);
    }
}

function decodePassword(passwordToken) {
    let decodedPassword = jwt.decode(passwordToken, require('../config/secret.js')());
    return decodedPassword;
}

module.exports = logs;
