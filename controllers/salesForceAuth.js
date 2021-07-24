const db = require('../models/index')
const { QueryTypes } = require('sequelize');
const { Validator } = require('node-input-validator');
const jwt = require('jwt-simple');
const request = require('request');
const axios = require("axios");
var FormData = require('form-data');

let salesForceAuth = {
    addSalesForceAccount: async function (req, res) {
        try {
            let validator = new Validator(req.body, {
                tenantId: 'required',
                userName: 'required|email',
                password: 'required',
                clientId: 'required',
                clientSecret: 'required',
                syncTime: 'required'
            });

            let matched = await validator.check();
            if (!matched) {
                let errorMessage = validation.parsevalidation(validator.errors);
                return res.status(422).send({ message: errorMessage });
            }
            let encodedPassword = await encodepassword(req.body.password);

            let salesForceUser = await db.sequelize.query('select * from crm_integration where tenant_id = :tenantId limit 1', {
                replacements: { tenantId: req.body.tenantId },
                type: QueryTypes.SELECT
            });

            if (salesForceUser) {
                let update = await db.sequelize.query('update crm_integration SET username = :username,password = :password, client_id = :clientId, client_secret = :clientSecret, updated_date = :updatedDate, sync_time = :syncTime where tenant_id = :tenantId', {
                    replacements: {
                        tenantId: req.body.tenantId,
                        username: req.body.userName,
                        password: encodedPassword,
                        clientId: req.body.clientId,
                        clientSecret: req.body.clientSecret,
                        updatedDate: new Date(),
                        syncTime: req.body.syncTime,
                    }
                });

                return res.status(200).send('successfully updated');
            }

            let insert = await db.sequelize.query('insert into crm_integration (tenant_id, username, password, client_id, client_secret, created_date) values (:tenantId,:username, :password, :clientId, :clientSecret, :createdDate)', {
                replacements: {
                    tenantId: req.body.tenantId,
                    username: req.body.userName,
                    password: encodedPassword,
                    clientId: req.body.clientId,
                    clientSecret: req.body.clientSecret,
                    createdDate: new Date()
                }
            });

            return res.status(200).send("successfully inserted user");
        } catch (error) {
            console.log(error)
        }
    },

    salesForceLogin: async function (req, res) {
        try {
            let validator = new Validator(req.body, {
                tenantId: 'required',
            });

            let matched = await validator.check();
            if (!matched) {
                let errorMessage = validation.parsevalidation(validator.errors);
                return res.status(422).send({ message: errorMessage });
            }

            let salesForceUser = await db.sequelize.query('select * from crm_integration where tenant_id = :tenantId limit 1', {
                replacements: { tenantId: req.body.tenantId },
                type: QueryTypes.SELECT
            });

            // if (salesForceUser[0]) {
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
            request(options, function (error, response) {
                if (error) throw new Error(error);
                return res.status(200).send(response.body);
            });
            // }

            // return res.status(400).send('Failed to login');
        } catch (error) {
            console.log('here rr', error);
            return res.status(500).send(error);
        }
    }
}
function encodepassword(password) {
    var token = jwt.encode(
        {
            password: password
        },
        require('../config/secret')()
    );

    return token;
}
function decodePassword(passwordToken) {
    let decodedPassword = jwt.decode(passwordToken, require('../config/secret.js')());
    return decodedPassword;
}
module.exports = salesForceAuth;