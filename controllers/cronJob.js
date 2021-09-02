const db = require('../models/index')
const { QueryTypes } = require('sequelize');
const log = require('./callLogs.js')
var cron = require('node-cron');

let cronApi = {
    syncCallLogs: async function (req, res) { 
        try {
            let date = new Date();
            date.setSeconds(0);
            date.setUTCMilliseconds(0);
            
            let crmIntegration = await db.sequelize.query('select * from crm_integration where status = true', {
                type: QueryTypes.SELECT
            });
            
            let crmIds = [];
            for (const iterator of crmIntegration) {
                
                if(!iterator.last_sync){
                    crmIds.push(iterator.id)
                    await log.callLogs(iterator.tenant_id)
                    await log.transferLogs(iterator.tenant_id)
                }else{
                    let dbLastSync = new Date(iterator.last_sync);
                    dbLastSync.setMinutes( dbLastSync.getMinutes() + iterator.sync_time);
                    if(dbLastSync <= date){
                        crmIds.push(iterator.id);
                        await log.callLogs(iterator.tenant_id)
                        await log.transferLogs(iterator.tenant_id)
                    }
                }
            }
            if(crmIds[0]){
                await db.sequelize.query('update crm_integration set last_sync = :lastSyncDate where id IN (:crmIds)', { replacements: {
                    crmIds: crmIds,
                    lastSyncDate: date,
                    }
                });
            }
            // return res.status(200).send('success');
        } catch (error) {
            console.log(error)
            // return res.status(500).send(error);
        }
    }
}
cron.schedule('* * * * *', () => {
    cronApi.syncCallLogs();
  });
module.exports = cronApi;