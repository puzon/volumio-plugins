const libQ = require('kew');
const fs=require('fs-extra');

module.exports = VolumioActions;

const VOLUMIO_ACTIONS = {
    "toggle": {
        label: "TRANSLATE.VOLUMIO_ACTION.ACTION_TOGGLE",
        command: "/usr/local/bin/volumio toggle",
    },
    "play": {
        label: "TRANSLATE.VOLUMIO_ACTION.ACTION_PLAY",
        command: "/usr/local/bin/volumio play",
    },
    "pause": {
        label: "TRANSLATE.VOLUMIO_ACTION.ACTION_PAUSE",
        command: "/usr/local/bin/volumio pause",
    },
    "next": {
        label: "TRANSLATE.VOLUMIO_ACTION.ACTION_NEXT",
        command: "/usr/local/bin/volumio next",
    },
    "previous": {
        label: "TRANSLATE.VOLUMIO_ACTION.ACTION_PREVIOUS",
        command: "/usr/local/bin/volumio previous",
    },
    "stop": {
        label: "TRANSLATE.VOLUMIO_ACTION.ACTION_STOP",
        command: "/usr/local/bin/volumio stop",
    },
    "clear": {
        label: "TRANSLATE.VOLUMIO_ACTION.ACTION_CLEAR",
        command: "/usr/local/bin/volumio clear",
    },
    "seek plus": {
        label: "TRANSLATE.VOLUMIO_ACTION.ACTION_SEEK_PLUS",
        command: "/usr/local/bin/volumio seek plus",
    },
    "seek minus": {
        label: "TRANSLATE.VOLUMIO_ACTION.ACTION_SEEK_MINUS",
        command: "/usr/local/bin/volumio seek minus",
    },
    "repeat": {
        label: "TRANSLATE.VOLUMIO_ACTION.ACTION_REPEAT",
        command: "/usr/local/bin/volumio repeat",
    },
    "random": {
        label: "TRANSLATE.VOLUMIO_ACTION.ACTION_RANDOM",
        command: "/usr/local/bin/volumio random",
    },
};


function VolumioActions(context) {
    let self = this;

    this.context = context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;
}
VolumioActions.prototype.update = function() {

    let self = this;
    let methodDefer=libQ.defer();
    // return libQ.resolve('');
    setTimeout(function () {
        self.logger.info('[' + Date.now() + '] ' + 'VolumioActions update');
        methodDefer.resolve(true);
    }, 100);
    return methodDefer.promise;
};

VolumioActions.prototype.getOptionsList = function () {
    let self = this;
    let list = {};
    for(let e in VOLUMIO_ACTIONS) {
        list[e] = VOLUMIO_ACTIONS[e].label;
    }
    // list[0] = "None";
    return list;
};

VolumioActions.prototype.getCommandForOption = function (option) {
    if(VOLUMIO_ACTIONS.hasOwnProperty(option)) {
        return VOLUMIO_ACTIONS[option].command;
    }
    return null;
};