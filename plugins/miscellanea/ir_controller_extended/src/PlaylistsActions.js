const libQ = require('kew');
const fs=require('fs-extra');

module.exports = PlaylistsActions;

const PLAYLIST_COMMAND = '/usr/bin/curl -s -X GET "http://localhost:3000/api/v1/commands/?cmd=playplaylist&name={{playlist}}" > /dev/null';

function PlaylistsActions(context) {
    let self = this;

    self.context = context;
    self.commandRouter = self.context.coreCommand;
    self.logger = self.context.logger;
    self.configManager = self.context.configManager;

    self.playlists = [];
}

PlaylistsActions.prototype.update = function() {
    let self = this;
    let methodDefer=libQ.defer();
    self.logger.info('[' + Date.now() + '] ' + 'List playlists');

    self.commandRouter.playListManager.listPlaylist().then(function(playlists) {
        self.logger.info('[' + Date.now() + '] ' + 'Playlists listed, count: ' + playlists.length);
        self.playlists = playlists;
        methodDefer.resolve();
    });
    return methodDefer.promise;
};

PlaylistsActions.prototype.getOptionsList = function () {
    let self = this;
    let list = {};
    for(let e of self.playlists) {
        list[e] = e;
    }
    // list[0] = "None";
    return list;
};
PlaylistsActions.prototype.getCommandForOption = function (option) {
    if(this.playlists && this.playlists.indexOf(option) !== -1) {
        return PLAYLIST_COMMAND.replace("{{playlist}}", option);
    }
    return null;
};