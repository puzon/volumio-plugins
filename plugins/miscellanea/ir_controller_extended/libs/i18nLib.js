
var libQ = require('kew');
var fs=require('fs-extra');

var i18nLib = {

    i18nObject: function (commandRouter, dictionaryFile,defaultDictionaryFile,jsonFile) {
        var methodDefer=libQ.defer();
        var defers=[];


        try {
            fs.readJsonSync(dictionaryFile);
        } catch(e) {
            dictionaryFile = defaultDictionaryFile;
        }

        defers.push(libQ.nfcall(fs.readJson,dictionaryFile));
        defers.push(libQ.nfcall(fs.readJson,defaultDictionaryFile));

        libQ.all(defers).
        then(function(documents)
        {

            var dictionary=documents[0];
            var defaultDictionary=documents[1];

            commandRouter.translateKeys(jsonFile,dictionary,defaultDictionary);

            methodDefer.resolve(jsonFile);
        })
            .fail(function(err){
                commandRouter.logger.info("ERROR LOADING JSON "+err);

                methodDefer.reject(new Error());
            });

        return methodDefer.promise;

    }
};

module.exports = i18nLib;