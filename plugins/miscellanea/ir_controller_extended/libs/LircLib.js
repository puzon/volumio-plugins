const Mustache = require('mustache');

const beginCodesRegEx = /[\s]*begin\s(codes|raw_codes)/g;
const endCodesRegEx = /[\s]*end\s(codes|raw_codes)/g;
const codeRegEx = /^[\s]*(name)?\s*([a-zA-Z\_0-9]+)(\s*[^\n]+)$/g;

const LIRCRC_TEMPLATE = `{{#entries}}
begin
prog = irexec
button = {{key}}
config = {{command}}
end
{{/entries}`;


const LircLib = {
    getKeys(lircd) {
        var lines = lircd.split("\n");
        var line;
        var keysNames = [];
        var beginCodes = false;
        for(line of lines) {
            if(!beginCodes) {
                if(beginCodesRegEx.test(line)) {
                    beginCodes = true;
                    continue;
                }
            } else {

                if(endCodesRegEx.test(line)) {
                    break;
                }

                var matches = new RegExp(codeRegEx).exec(line);
                if(matches) {
                    keysNames.push(matches[2]);
                }
            }
        }

        return keysNames;
    },

    makeLircrc(data) {

    }
};

module.exports = LircLib;
