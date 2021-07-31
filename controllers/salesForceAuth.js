const db = require('../models/index')
const { QueryTypes } = require('sequelize');
const { Validator } = require('node-input-validator');
const jwt = require('jwt-simple');
const request = require('request');
const axios = require("axios");
var FormData = require('form-data');
const { token } = require('morgan');

let salesForceAuth = {
    addSalesForceAccount: async function (req, res) {
        try {

            // var token = jwt.encode(
            //     {
            //         username:'hardik@itoneclick.com',
            //         password:'Oneclick1@hSCkZMoDDwHy9vJbAO94SWh2',
            //         client_id:'3MVG9fe4g9fhX0E7rlHBLWeVJX9XmwGpDEFPsI.VQz91.pdpEXUPQlR1zDZ4hwuKUbSvMI_Huun4r9B9LEZ1l',
            //         client_secret:'C4608E3701EE3BC1ECF88F9DB38D5DB4CBE90B0D7BBD51D5FCCF67D500EBFE1D',
            //         tenantId: 30,
            //         syncTime:10
            //     },
            //     require('../config/secret')()
            // );
            // console.log('token--------',token)
            let validator = new Validator(req.body, {
               tenantId: 'required',
               userName: 'required',
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
            let userCred = await decodePassword(req.body.tenantId)
            console.log(userCred);
            let encodedPassword = await encodepassword(req.body.password);

            let salesForceUser = await db.sequelize.query('select * from crm_integration where tenant_id = :tenantId limit 1', {
                replacements: { tenantId: userCred.tenantId },
                type: QueryTypes.SELECT
            });

            if (salesForceUser[0]) {
                let update = await db.sequelize.query('update crm_integration SET username = :username,password = :password, client_id = :clientId, client_secret = :clientSecret, updated_date = :updatedDate, sync_time = :syncTime where tenant_id = :tenantId', {
                    replacements: {
                        tenantId: userCred.tenantId,
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

            let insert = await db.sequelize.query('insert into crm_integration (tenant_id, username, password, client_id, client_secret,sync_time, created_date) values (:tenantId,:username, :password, :clientId, :clientSecret, :syncTime, :createdDate)', {
                replacements: {
                    tenantId: userCred.tenantId,
                    username: userCred.username,
                    password: encodedPassword,
                    clientId: userCred.client_id,
                    clientSecret: userCred.client_secret,
                    syncTime: userCred.syncTime,
                    createdDate: new Date()
                }
            });

            return res.status(200).send("successfully inserted user");
        } catch (error) {
            console.log(error)
        }
    },

    getCredentials: async function (req, res){
        try {
            // let validator = new Validator(req.headers, {
            //     token: 'required',
            // });

            // let matched = await validator.check();
            // if (!matched) {
            //     let errorMessage = validation.parsevalidation(validator.errors);
            //     return res.status(422).send({ message: errorMessage });
            // }

            let decodedToken = await decodePassword(req.headers['x-access-token']);
            console.log(decodedToken)

            let salesForceUser = await db.sequelize.query('select * from crm_integration where tenant_id = :tenantId limit 1', {
                replacements: { tenantId: decodedToken.tenantId },
                type: QueryTypes.SELECT
            });

            if(!salesForceUser[0]){
                return res.status(404).send("no user found");
            }

            // salesForceUser[0]['decodedPassword'] = await decodePassword(salesForceUser[0].password);
            return res.status(200).send(salesForceUser);
            
        } catch (error) {
           return res.status(500).send(error);
        }
    },

    // salesForceLogin: async function (req, res) {
    //     try {
    //         let validator = new Validator(req.body, {
    //             crmIntegerationId: 'required',
    //         });

    //         let matched = await validator.check();
    //         if (!matched) {
    //             let errorMessage = validation.parsevalidation(validator.errors);
    //             return res.status(422).send({ message: errorMessage });
    //         }

    //         let salesForceUser = await db.sequelize.query('select * from crm_integration where id = :id limit 1', {
    //             replacements: { id: req.body.crmIntegerationId },
    //             type: QueryTypes.SELECT
    //         });

    //         // if (salesForceUser[0]) {
    //         let decodedPassword = await decodePassword(salesForceUser[0].password);
    //         var options = {
    //             'method': 'post',
    //             'url': 'https://login.salesforce.com/services/oauth2/token',
    //             formData: {
    //                 'username': salesForceUser[0].username,
    //                 'password': decodedPassword.password,
    //                 'grant_type': 'password',
    //                 'client_id': salesForceUser[0].client_id,
    //                 'client_secret': salesForceUser[0].client_secret
    //             }
    //         };
    //         request(options, function (error, response) {
    //             if (error) throw new Error(error);
    //             return res.status(200).send(response.body);
    //         });
    //         // }

    //         // return res.status(400).send('Failed to login');
    //     } catch (error) {
    //         console.log('here rr', error);
    //         return res.status(500).send(error);
    //     }
    // }
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