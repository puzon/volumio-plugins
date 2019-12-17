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
const Config = require('./src/Config');
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

    this.actions = {
        'volumioActions': new VolumioActions(this.context),
        'playlistsActions': new PlaylistsActions(this.context),
    };

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
    let methodDefer = libQ.defer();

    try {
        let defers = [];
        for (let at in self.actions) {
            defers.push(self.actions[at].update());//libQ.ncall(self.plugin.actions[at].update, self.plugin.actions[at]));
        }

        libQ.all(defers).then(function (actions) {
            try {
                self.logger.info('[' + Date.now() + '] ' + 'saveKeys, actions updated, saving data');
                // let configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
                // self.commandRouter.pushToastMessage('success', 'configFile', configFile);
                for (let i in data) {
                    if (data.hasOwnProperty(i)) {
                        // self.logger.info('[' + Date.now() + '] ' + i + ": " + data[i]);
                        let val = data[i];
                        if(typeof val === 'object' && val.hasOwnProperty('value')) {
                            val = val.value;
                        }
                        self.config.set(i, val);
                    }
                }
                self.generateLircConfig()
                    .then(function (res) {
                        self.commandRouter.pushToastMessage('success', "Keys saved", "");

                        let irControllerData = {
                            ir_profile: {
                                value: Config.CUSTOM_REMOTE_NAME,
                            },
                        };
                        self.commandRouter.executeOnPlugin('accessory', 'ir_controller', 'saveIROptions', irControllerData);
                        methodDefer.resolve();


                    })
                    .fail(function (e) {
                        self.logger.info('[' + Date.now() + '] ' + 'generateLircConfig error: ' + e);
                        methodDefer.reject(e);
                    });
            } catch (e) {

                self.logger.info('[' + Date.now() + '] ' + 'saveKeys, error: ' + e);
            }

        });
    } catch (e) {
        self.logger.info('[' + Date.now() + '] ' + 'Error generating keys: ' + e);
    }


    return methodDefer.promise;
};
IrControllerExtended.prototype.generateLircConfig = function()
{
    let self = this;

    let activeProfile = self.config.get("ir_profile", "JustBoom IR Remote");
    let lircd = fs.readFileSync(path.resolve(Config.IR_REMOTE_PATH, "configurations", activeProfile, "lircd.conf"));
    let keys = LircLib.getKeys(lircd.toString());
    let keyIdPrefix = activeProfile ? activeProfile + "_" : "";

    let keysConfig = [];
    for (let key of keys) {

        let typeId = `${keyIdPrefix}key_${key}_type`;
        let volumioActionId = `${keyIdPrefix}key_${key}_volumioAction`;
        let playlistId = `${keyIdPrefix}key_${key}_playlist`;
        let execId = `${keyIdPrefix}key_${key}_exec`;

        let typeValue = self.config.get(typeId, "no_action");

        let k = {
            key: key,
            type: typeValue,
            command: false,
        };
        if (k.type === "volumio_action") {
            let volumioActionValue = self.config.get(volumioActionId, 0);
            self.logger.info('[' + Date.now() + '] ' + 'Get command for action: ' + volumioActionValue);
            k.command = self.actions.volumioActions.getCommandForOption(volumioActionValue);
        } else if (k.type === "playlist_action") {
            let playlistValue = self.config.get(playlistId, 0);
            self.logger.info('[' + Date.now() + '] ' + 'Get command for playlist: ' + playlistValue);
            k.command = self.actions.playlistsActions.getCommandForOption(playlistValue);
        } else if (k.type === "exec_action") {
            let execValue = self.config.get(execId, 0);
            self.logger.info('[' + Date.now() + '] ' + 'Get command for playlist: ' + execValue);
            k.command = self.actions.playlistsActions.getCommandForOption(execValue);
        }
        if(k.command) {
            keysConfig.push(k);
        }
    }

    self.logger.info('[' + Date.now() + '] ' + 'MAKE LIRCRC: ' + JSON.stringify(keysConfig));
    let lircrc = LircLib.makeLircrc(keysConfig);
    self.logger.info('[' + Date.now() + '] ' + 'LIRCRC: ' + lircrc);

    return this.saveCustomConfig(lircd, lircrc);
};

IrControllerExtended.prototype.saveCustomConfig = function(lircd, lircrc)
{
    let self = this;
    let methodDefer = libQ.defer();
    let basePath = path.resolve(Config.IR_REMOTE_PATH, 'configurations', Config.CUSTOM_REMOTE_NAME);
    if(!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath);
    }
    fs.writeFileSync(path.resolve(basePath, 'lircd.conf'), lircd);

    self.logger.info('[' + Date.now() + '] ' + 'Save custom remote in ' + basePath);
    let defers = [
        fs.writeFile(path.resolve(basePath, 'lircd.conf'), lircd),
        fs.writeFile(path.resolve(basePath, 'lircrc'), lircrc),
    ];
    libQ.all(defers)
    .then(function (results) {
        self.logger.info('[' + Date.now() + '] ' + 'saveCustomConfig OK');
        methodDefer.resolve('');
    })
    .fail(function (e) {
        methodDefer.reject(e);
        self.logger.info('[' + Date.now() + '] ' + 'saveCustomConfig FAILED: ' + e);
    });

    return methodDefer.promise;
};

IrControllerExtended.prototype.onVolumioStart = function()
{
    let self = this;
    let configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
    // self.commandRouter.pushToastMessage('info', "configFile", configFile);

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
IrControllerExtended.prototype.checkIrPlugin = function() {
    this.logger.info('[' + Date.now() + '] ' + 'checkIrPlugin: ' + fs.existsSync(Config.IR_REMOTE_PATH));
    return fs.existsSync(Config.IR_REMOTE_PATH);
};

IrControllerExtended.prototype.getUIConfig = function() {
    let self = this;
    try {
        if(self.checkIrPlugin()) {
            return self.configui.getUI();
        } else {
            return self.configui.getUnavailableUI();
        }
        // return
        // return this.configui.getUI();
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
