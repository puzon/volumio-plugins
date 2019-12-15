'use strict';

const libQ = require('kew');
const fs=require('fs-extra');
const path=require('path');
const config = new (require('v-conf'))();
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const _ = require('underscore');
const LircLib = require('./libs/LircLib');
const i18nLib = require('./libs/i18nLib');
const ObjectUtils = require('./libs/ObjectUtils');
const ConfigUI = require('./src/ConfigUI');
const VolumioActions = require('./src/VolumioActions');
const PlaylistsActions = require('./src/PlaylistsActions');


module.exports = IrControllerExtended;
function IrControllerExtended(context) {
    let self = this;

    this.context = context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;

    this.configui = new ConfigUI(this);

}

IrControllerExtended.prototype.saveProfile = function(data)
{
    let self = this;

    self.config.set("ir_profile", data.ir_profile.value);


    let respconfig = self.commandRouter.getUIConfigOnPlugin('miscellanea', 'ir_controller_extended', {});

    respconfig.then(function(config)
    {
        self.commandRouter.broadcastMessage('pushUiConfig', config);
        self.commandRouter.pushToastMessage('success', "Profile set", "Reloading config...");
    });


};

IrControllerExtended.prototype.saveKeys = function(data) {
    let self = this;

    try {
        // let configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
        // self.commandRouter.pushToastMessage('success', 'configFile', configFile);

        let activeProfile = self.config.get("ir_profile", "JustBoom IR Remote");
        let lircd = fs.readFileSync(path.resolve(__dirname, "configurations", activeProfile, "lircd.conf"));
        let keys = LircLib.getKeys(lircd.toString());
        let keyIdPrefix = activeProfile ? activeProfile + "_" : "";

        for(let i in data) {
            if(data.hasOwnProperty(i)) {
                self.config.set(i, data[i].value);
                // self.commandRouter.pushToastMessage('success', i, JSON.stringify(self.config.data));
            }
        }
        // return;
        let keysConfig = [];
        for (let key of keys) {

            let typeId = `${keyIdPrefix}key_${key}_type`;
            let volumioActionId = `${keyIdPrefix}key_${key}_volumioAction`;
            let playlistId = `${keyIdPrefix}key_${key}_playlist`;
            let execId = `${keyIdPrefix}key_${key}_exec`;


            let k = {
                key: key,
                type: data[typeId] ? data[typeId].value : null,
                command: false,
            };
            if (k.type == 1) {
                self.logger.info('[' + Date.now() + '] ' + 'Get command for action: ' + data[volumioActionId].value);
                k.command = self.configui.actions.volumioActions.getCommandForOption(data[volumioActionId].value);
            } else if (k.type == 2) {
                self.logger.info('[' + Date.now() + '] ' + 'Get command for playlist: ' + data[playlistId].value);
                k.command = self.configui.actions.playlistsActions.getCommandForOption(data[playlistId].value);
            }

            keysConfig.push(k);
        }

        self.logger.info('[' + Date.now() + '] ' + 'MAKE LIRCRC: ' + JSON.stringify(keysConfig));
        LircLib.makeLircrc(keysConfig);
    } catch (e) {

        self.logger.info('[' + Date.now() + '] ' + 'Error generating keys: ' + e);
    }





    self.commandRouter.pushToastMessage('success', "Keys saved", "");

};

IrControllerExtended.prototype.onVolumioStart = function()
{
    let self = this;
    let configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
    self.commandRouter.pushToastMessage('info', "configFile", configFile);

    this.config = new (require('v-conf'))();
    this.config.loadFile(configFile);

    return libQ.resolve();
};

IrControllerExtended.prototype.onStart = function() {
    let self = this;
    let defer=libQ.defer();
    // self.commandRouter.pushToastMessage('success', "Account Login", "Login was successful");

    // Once the Plugin has successfull started resolve the promise
    defer.resolve();

    return defer.promise;
};

IrControllerExtended.prototype.onStop = function() {
    let self = this;
    let defer=libQ.defer();

    // Once the Plugin has successfull stopped resolve the promise
    defer.resolve();

    return libQ.resolve();
};

IrControllerExtended.prototype.onRestart = function() {
    let self = this;
    // Optional, use if you need it
};


// Configuration Methods -----------------------------------------------------------------------------

IrControllerExtended.prototype.getUIConfig = function() {
    try {
        return this.configui.getUI();
    } catch (e) {
        this.logger.info('[' + Date.now() + '] ' + 'Error in pushKeysConfig: ' + e);
        return libQ.reject(new Error('Error generating config'));
    }

};


IrControllerExtended.prototype.getConfigurationFiles = function() {
    return ['config.json'];
};

/*
IrControllerExtended.prototype.setUIConfig = function(data) {
    let self = this;
    //Perform your installation tasks here
};*/
/*

IrControllerExtended.prototype.getConf = function(varName) {
    let self = this;
    //Perform your installation tasks here
};

IrControllerExtended.prototype.setConf = function(varName, varValue) {
    let self = this;
    //Perform your installation tasks here
};
*/
