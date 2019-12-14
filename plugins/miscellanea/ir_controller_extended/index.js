'use strict';

var libQ = require('kew');
var fs=require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var _ = require('underscore');
var LircLib = require('./libs/LircLib');
var i18nLib = require('./libs/i18nLib');
var ObjectUtils = require('./libs/ObjectUtils');



module.exports = IrControllerExtended;
function IrControllerExtended(context) {
    var self = this;

    this.context = context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;

}

IrControllerExtended.prototype.saveProfile = function(data)
{
    var self = this;

    self.config.set("ir_profile", data.ir_profile.value);


    var respconfig = self.commandRouter.getUIConfigOnPlugin('miscellanea', 'ir_controller_extended', {});

    respconfig.then(function(config)
    {
        self.commandRouter.broadcastMessage('pushUiConfig', config);
        self.commandRouter.pushToastMessage('success', "Profile set", "Reloading config...");
    });


};
IrControllerExtended.prototype.saveKeys = function(data) {
    var self = this;

    // var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
    // self.commandRouter.pushToastMessage('success', 'configFile', configFile);
    for(var i in data) {
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
    var self = this;
    var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
    this.config = new (require('v-conf'))();
    this.config.loadFile(configFile);

    return libQ.resolve();
};

IrControllerExtended.prototype.onStart = function() {
    var self = this;
    var defer=libQ.defer();
    // self.commandRouter.pushToastMessage('success', "Account Login", "Login was successful");

    // Once the Plugin has successfull started resolve the promise
    defer.resolve();

    return defer.promise;
};

IrControllerExtended.prototype.onStop = function() {
    var self = this;
    var defer=libQ.defer();

    // Once the Plugin has successfull stopped resolve the promise
    defer.resolve();

    return libQ.resolve();
};

IrControllerExtended.prototype.onRestart = function() {
    var self = this;
    // Optional, use if you need it
};


// Configuration Methods -----------------------------------------------------------------------------

IrControllerExtended.prototype.getUIConfig = function() {
    var defer = libQ.defer();
    var self = this;

    var lang_code = this.commandRouter.sharedVars.get('language_code');
    var dirs = fs.readdirSync(__dirname + "/configurations");

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

            var activeProfile = self.config.get("ir_profile", "JustBoom IR Remote");
            uiconf.sections[0].content[0].value.value = activeProfile;
            uiconf.sections[0].content[0].value.label = activeProfile;

            for (var i = 0; i < dirs.length; i++) {
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

    var self = this;
    var lircd = fs.readFileSync(__dirname + "/configurations/" + activeProfile + "/lircd.conf");
    var keys = LircLib.getKeys(lircd.toString());

    for(var key of keys) {
        var keyConfig = this.getKeyConfig(key, activeProfile);
        for(var conf of keyConfig) {
            // this.commandRouter.translateKeys(conf);
            self.configManager.pushUIConfigParam(uiconf, 'sections[1].saveButton.data', conf.id);
            self.configManager.pushUIConfigParam(uiconf, 'sections[1].content', conf);
        }
    }
};

IrControllerExtended.prototype.getPlaylistsOptions = function() {
    var self = this;
    var list = {};
    for(var e of self.playlists) {
        list[e] = e;
    }
    // list[0] = "None";
    return list;
};

IrControllerExtended.prototype.getKeyConfig = function(key, remoteName) {
    var self = this;
    var keyIdPrefix = remoteName ? remoteName + "_" : "";

    var typeId = `${keyIdPrefix}key_${key}_type`;
    var volumioActionId = `${keyIdPrefix}key_${key}_volumioAction`;
    var playlistId = `${keyIdPrefix}key_${key}_playlist`;
    var execId = `${keyIdPrefix}key_${key}_exec`;

    var typeValue = self.config.get(typeId, 0);
    var volumioActionValue = self.config.get(volumioActionId, 0);
    var playlistValue = self.config.get(playlistId, self.playlists.length ? self.playlists[0] : 0);
    var execValue = self.config.get(execId, '');


    var keyLabel = key.replace("KEY_", "");

    var typeOptions = {
        0: "TRANSLATE.ACTIONS.NO_ACTION",
        1: "TRANSLATE.ACTIONS.VOLUMIO_ACTION",
        2: "TRANSLATE.ACTIONS.PLAYLIST",
        3: "TRANSLATE.ACTIONS.EXEC"
    };

    var actionsOptions = {
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

    var playlistsOptions = self.getPlaylistsOptions();

    typeValue = JSON.stringify({value: typeValue, label: typeOptions[typeValue]});
    volumioActionValue = JSON.stringify({value: volumioActionValue, label: actionsOptions[volumioActionValue]});
    playlistValue = JSON.stringify({value: playlistValue, label: playlistsOptions[playlistValue]});


    var template = `[{
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
    var data = JSON.parse(template);
    data[0].options = ObjectUtils.simpleArrayToObjectArray(typeOptions, 'value', 'label');
    data[1].options = ObjectUtils.simpleArrayToObjectArray(actionsOptions, 'value', 'label');
    data[2].options = ObjectUtils.simpleArrayToObjectArray(playlistsOptions, 'value', 'label');

    return data;
};

IrControllerExtended.prototype.getConfigurationFiles = function() {
    return ['config.json'];
}
/*
IrControllerExtended.prototype.setUIConfig = function(data) {
    var self = this;
    //Perform your installation tasks here
};*/
/*

IrControllerExtended.prototype.getConf = function(varName) {
    var self = this;
    //Perform your installation tasks here
};

IrControllerExtended.prototype.setConf = function(varName, varValue) {
    var self = this;
    //Perform your installation tasks here
};
*/


