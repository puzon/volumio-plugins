'use strict';

const libQ = require('kew');
const fs=require('fs-extra');
const config = new (require('v-conf'))();
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const _ = require('underscore');
const LircLib = require('./libs/LircLib');
const i18nLib = require('./libs/i18nLib');
const ObjectUtils = require('./libs/ObjectUtils');


module.exports = IrControllerExtended;
function IrControllerExtended(context) {
    let self = this;

    this.context = context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;
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

    // let configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
    // self.commandRouter.pushToastMessage('success', 'configFile', configFile);
    for(let i in data) {
        if(data.hasOwnProperty(i)) {
            self.config.set(i, data[i].value);
            // self.commandRouter.pushToastMessage('success', i, JSON.stringify(self.config.data));
            // return;
        }
    }

    self.commandRouter.pushToastMessage('success', "Keys saved", "");

};

IrControllerExtended.prototype.onVolumioStart = function()
{
    let self = this;
    let configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
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
    let defer = libQ.defer();
    let self = this;

    let lang_code = this.commandRouter.sharedVars.get('language_code');
    let dirs = fs.readdirSync(__dirname + "/configurations");

    self.commandRouter.pushToastMessage('info', "Loading data...");
    self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
            __dirname+'/i18n/strings_en.json',
            __dirname + '/UIConfig.json')
    .then(function(uiconf)
    {
        self.logger.info('[' + Date.now() + '] ' + 'List playlists');

        self.commandRouter.playListManager.listPlaylist().then(function(playlists) {

            self.playlists = playlists;
            // self.logger.info('[' + Date.now() + '] ' + 'Playlists: ' + JSON.stringify(playlists));

            let activeProfile = self.config.get("ir_profile", "JustBoom IR Remote");
            uiconf.sections[0].content[0].value.value = activeProfile;
            uiconf.sections[0].content[0].value.label = activeProfile;

            for (let i = 0; i < dirs.length; i++) {
                self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[0].options', {
                    value: dirs[i],
                    label: dirs[i]
                });
            }

            self.pushKeysConfig(uiconf, activeProfile);

            i18nLib.i18nObject(
                self.commandRouter,
                __dirname+'/i18n/strings_en.json',
                __dirname + '/UIConfig.json',
                uiconf
            )
                .then(function(lastUiConf) {
                    self.commandRouter.pushToastMessage('success', "Complete!");
                defer.resolve(uiconf);

            });
        });


    })
    .fail(function()
    {
        defer.reject(new Error());
    });

    return defer.promise;
};

IrControllerExtended.prototype.pushKeysConfig = function(uiconf, activeProfile) {

    let self = this;
    let lircd = fs.readFileSync(__dirname + "/configurations/" + activeProfile + "/lircd.conf");
    let keys = LircLib.getKeys(lircd.toString());

    for(let key of keys) {
        let keyConfig = this.getKeyConfig(key, activeProfile);
        for(let conf of keyConfig) {
            // this.commandRouter.translateKeys(conf);
            self.configManager.pushUIConfigParam(uiconf, 'sections[1].saveButton.data', conf.id);
            self.configManager.pushUIConfigParam(uiconf, 'sections[1].content', conf);
        }
    }
};

IrControllerExtended.prototype.getPlaylistsOptions = function() {
    let self = this;
    let list = {};
    for(let e of self.playlists) {
        list[e] = e;
    }
    // list[0] = "None";
    return list;
};

IrControllerExtended.prototype.getKeyConfig = function(key, remoteName) {
    let self = this;
    let keyIdPrefix = remoteName ? remoteName + "_" : "";

    let typeId = `${keyIdPrefix}key_${key}_type`;
    let volumioActionId = `${keyIdPrefix}key_${key}_volumioAction`;
    let playlistId = `${keyIdPrefix}key_${key}_playlist`;
    let execId = `${keyIdPrefix}key_${key}_exec`;

    let typeValue = self.config.get(typeId, 0);
    let volumioActionValue = self.config.get(volumioActionId, 0);
    let playlistValue = self.config.get(playlistId, self.playlists.length ? self.playlists[0] : 0);
    let execValue = self.config.get(execId, '');


    let keyLabel = key.replace("KEY_", "");

    let typeOptions = {
        0: "TRANSLATE.ACTIONS.NO_ACTION",
        1: "TRANSLATE.ACTIONS.VOLUMIO_ACTION",
        2: "TRANSLATE.ACTIONS.PLAYLIST",
        3: "TRANSLATE.ACTIONS.EXEC"
    };

    let actionsOptions = {
        0: "TRANSLATE.VOLUMIO_ACTION.ACTION_TOGGLE",
        1: "TRANSLATE.VOLUMIO_ACTION.ACTION_PLAY",
        2: "TRANSLATE.VOLUMIO_ACTION.ACTION_PAUSE",
        3: "TRANSLATE.VOLUMIO_ACTION.ACTION_NEXT",
        4: "TRANSLATE.VOLUMIO_ACTION.ACTION_PREVIOUS",
        5: "TRANSLATE.VOLUMIO_ACTION.ACTION_STOP",
        6: "TRANSLATE.VOLUMIO_ACTION.ACTION_CLEAR",
        7: "TRANSLATE.VOLUMIO_ACTION.ACTION_SEEK_PLUS",
        8: "TRANSLATE.VOLUMIO_ACTION.ACTION_SEEK_MINUS",
        9: "TRANSLATE.VOLUMIO_ACTION.ACTION_REPEAT",
        10: "TRANSLATE.VOLUMIO_ACTION.ACTION_RANDOM",
    };

    let playlistsOptions = self.getPlaylistsOptions();

    typeValue = JSON.stringify({value: typeValue, label: typeOptions[typeValue]});
    volumioActionValue = JSON.stringify({value: volumioActionValue, label: actionsOptions[volumioActionValue]});
    playlistValue = JSON.stringify({value: playlistValue, label: playlistsOptions[playlistValue]});


    let template = `[{
          "id": "${typeId}",
          "element": "select",
          "doc": "TRANSLATE.PROFILE_SELECTOR_DOC",
          "label": "Key ${keyLabel}",
          "value":  ${typeValue},
          "options": []

        },
        {
          "id": "${volumioActionId}",
          "element": "select",
          "description": "TRANSLATE.VOLUMIO_ACTION.LABEL",
          "value":  ${volumioActionValue},
          "options": []
        },
        {
          "id": "${playlistId}",
          "element": "select",
          "description": "TRANSLATE.PLAYLIST.LABEL",
          "value":  ${playlistValue},
          "options": []
        },
        {
          "id": "${execId}",
          "element": "input",
          "type": "text",
          "description": "TRANSLATE.EXEC.LABEL",
          "value":  "",
          "attributes:": [
            {"placeholder": "Enter linux command exec"}
          ]
        }]`;
    let data = JSON.parse(template);
    data[0].options = ObjectUtils.simpleArrayToObjectArray(typeOptions, 'value', 'label');
    data[1].options = ObjectUtils.simpleArrayToObjectArray(actionsOptions, 'value', 'label');
    data[2].options = ObjectUtils.simpleArrayToObjectArray(playlistsOptions, 'value', 'label');

    return data;
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
