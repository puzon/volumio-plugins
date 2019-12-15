const libQ = require('kew');
const fs=require('fs-extra');
const path=require('path');
const _ = require('underscore');
const LircLib = require('../libs/LircLib');
const i18nLib = require('../libs/i18nLib');
const ObjectUtils = require('../libs/ObjectUtils');
const VolumioActions = require('./VolumioActions');
const PlaylistsActions = require('./PlaylistsActions');

module.exports = ConfigUI;
function ConfigUI(plugin) {
    this.plugin = plugin;
    this.context = this.plugin.context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;

    this.actions = {
        'volumioActions': new VolumioActions(this.plugin.context),
        'playlistsActions': new PlaylistsActions(this.plugin.context),
    };
}

ConfigUI.prototype.getUI = function () {
    let self = this;
    // let configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
    // self.commandRouter.pushToastMessage('info', "configFile", configFile);

    let defer = libQ.defer();

    let root = path.resolve(__dirname, "../");

    let lang_code = this.commandRouter.sharedVars.get('language_code');
    let dirs = fs.readdirSync( path.resolve(root, "configurations"));

    self.commandRouter.pushToastMessage('info', "Loading data...");
    self.commandRouter.i18nJson(path.resolve(root,'i18n', 'strings_'+lang_code+'.json'),
        path.resolve(root,'i18n', 'strings_en.json'),
            path.resolve(root, 'UIConfig.json'))
        .then(function(uiconf)
        {
            try {
                // self.logger.info('[' + Date.now() + '] ' + 'Playlists: ' + JSON.stringify(playlists));

                let activeProfile = self.plugin.config.get("ir_profile", "JustBoom IR Remote");
                uiconf.sections[0].content[0].value.value = activeProfile;
                uiconf.sections[0].content[0].value.label = activeProfile;

                for (let i = 0; i < dirs.length; i++) {
                    self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[0].options', {
                        value: dirs[i],
                        label: dirs[i]
                    });
                }

                self.pushKeysConfig(uiconf, activeProfile)
                    .then(function () {


                        i18nLib.i18nObject(
                            self.commandRouter,
                            path.resolve(root, 'i18n', 'strings_en.json'),
                                path.resolve(root, 'UIConfig.json'),
                            uiconf
                        )
                            .then(function (lastUiConf) {
                                self.commandRouter.pushToastMessage('success', "Complete!");
                                defer.resolve(uiconf);
                            });
                    });
            } catch (e) {

                self.logger.info('[' + Date.now() + '] ' + 'Error in getUIConfig: ' + e);
                return libQ.reject(new Error());
            }
        })
        .fail(function()
        {
            defer.reject(new Error());
        });

    return defer.promise;
};


ConfigUI.prototype.pushKeysConfig = function(uiconf, activeProfile) {

    let self = this;
    let lircd = fs.readFileSync(path.resolve(__dirname, "../", "configurations", activeProfile, "lircd.conf"));
    let keys = LircLib.getKeys(lircd.toString());
    let methodDefer = libQ.defer();
    try {
        let defers = [];
        for (let at in self.actions) {
            defers.push(self.actions[at].update());//libQ.ncall(self.actions[at].update, self.actions[at]));
        }

        // defers.push(libQ.nfcall(fs.readJson,dictionaryFile));

        self.logger.info('[' + Date.now() + '] ' + 'Executing ' + defers.length + ' actions...');
        libQ.all(defers).then(function (actions) {
            self.logger.info('[' + Date.now() + '] ' + 'Actions updated');
            for (let key of keys) {
                let keyConfig = self.getKeyConfig(key, activeProfile);
                for (let conf of keyConfig) {
                    // this.commandRouter.translateKeys(conf);
                    self.configManager.pushUIConfigParam(uiconf, 'sections[1].saveButton.data', conf.id);
                    self.configManager.pushUIConfigParam(uiconf, 'sections[1].content', conf);
                }
            }
            methodDefer.resolve();
        }).fail(function(e) {
            self.logger.info('[' + Date.now() + '] ' + 'Error in pushKeysConfig: ' + e);
            return methodDefer.reject(new Error("Error in pushKeysConfig"));
        });
    } catch (e) {
        self.logger.info('[' + Date.now() + '] ' + 'Error in pushKeysConfig: ' + e);
        return libQ.reject(new Error());
    }
    return methodDefer;
};


ConfigUI.prototype.getKeyConfig = function(key, remoteName) {
    let self = this;
    let keyIdPrefix = remoteName ? remoteName + "_" : "";


    let actionsOptions = self.actions.volumioActions.getOptionsList();
    let playlistsOptions = self.actions.playlistsActions.getOptionsList();

    let typeId = `${keyIdPrefix}key_${key}_type`;
    let volumioActionId = `${keyIdPrefix}key_${key}_volumioAction`;
    let playlistId = `${keyIdPrefix}key_${key}_playlist`;
    let execId = `${keyIdPrefix}key_${key}_exec`;

    let typeValue = self.plugin.config.get(typeId, 0);
    let volumioActionValue = self.plugin.config.get(volumioActionId, 'toggle');
    let playlistValue = self.plugin.config.get(playlistId, playlistsOptions.length ? playlistsOptions[0] : 0);
    let execValue = self.plugin.config.get(execId, '');


    let keyLabel = key.replace("KEY_", "");

    let typeOptions = {
        0: "TRANSLATE.ACTIONS.NO_ACTION",
        1: "TRANSLATE.ACTIONS.VOLUMIO_ACTION",
        2: "TRANSLATE.ACTIONS.PLAYLIST",
        3: "TRANSLATE.ACTIONS.EXEC"
    };

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
