'use strict';

var libQ = require('kew');
var fs=require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;


module.exports = IrControllerExtended;
function IrControllerExtended(context) {
    var self = this;

    this.context = context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;

}

IrControllerExtended.prototype.setProfile = function()
{
    // self.commandRouter.pushToastMessage('success', "Account Login", "Login was successful");

};

IrControllerExtended.prototype.onVolumioStart = function()
{
    var self = this;
    var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
    this.config = new (require('v-conf'))();
    this.config.loadFile(configFile);

    return libQ.resolve();
}

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

    self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
            __dirname+'/i18n/strings_en.json',
            __dirname + '/UIConfig.json')
    .then(function(uiconf)
    {

        var activeProfile = self.config.get("ir_profile", "JustBoom IR Remote");
        uiconf.sections[0].content[0].value.value = activeProfile;
        uiconf.sections[0].content[0].value.label = activeProfile;

        for (var i = 0; i < dirs.length; i++) {
            self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[0].options', {
                value: dirs[i],
                label: dirs[i]
            });
        }
        defer.resolve(uiconf);
    })
    .fail(function()
    {
        defer.reject(new Error());
    });

    return defer.promise;
};

IrControllerExtended.prototype.getConfigurationFiles = function() {
    return ['config.json'];
}

IrControllerExtended.prototype.setUIConfig = function(data) {
    var self = this;
    //Perform your installation tasks here
};

IrControllerExtended.prototype.getConf = function(varName) {
    var self = this;
    //Perform your installation tasks here
};

IrControllerExtended.prototype.setConf = function(varName, varValue) {
    var self = this;
    //Perform your installation tasks here
};


