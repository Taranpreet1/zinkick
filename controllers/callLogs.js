const db = require('../models/index')
const { QueryTypes } = require('sequelize');
const { response } = require('express');
const request = require('request');
const jwt = require('jwt-simple');
// var salesLogin = require('./salesForceAuth.js');


let logs = {


    callLogs: async function (req, res) {
        try {
            let logs = await db.sequelize.query('select call_logs.id, call_logs.duration, call_logs.outcome, call_logs.call_start, call_logs.key_contact_id, call_logs.due_date from call_logs inner join key_contacts on call_logs.key_contact_id = key_contacts.id inner join campaigns on key_contacts.campaign_id = campaigns.id where campaigns.tenant_id = :tenantId', {
                replacements: { tenantId: req.query.tenantId },
                type: QueryTypes.SELECT
            });
            console.log(logs)
            // if (logs[0]) {
            //     return res.status(200).send({ message: logs });
            // }
            // else {
            //     return res.status(500).send({ message: 'Something went wrong' });
            // }

            let auth = await salesForceLogin(req.query.tenantId);

            var options = {
                'method': 'post',
                'url': 'https://oneclick2-dev-ed.my.salesforce.com/V52.0/jobs/ingest/',
                'headers': {
                    'Authorization': 'Bearer' + ' ' + auth.access_token
                },
                body: { logs: logs }
            };
            request(options, function (request, error) {
                if (error) throw new Error(error);
                return res.status(200).send(request);
            });

        } catch (error) {
            console.log(error)
        }
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
