
var LircLib = require('../libs/LircLib');
var fs=require('fs-extra');
var assert = require('assert');

// var remote = "Denon Remote RC-1104";
var remote = "Arcam ir-DAC-II Remote";
// var remote = "JustBoom IR Remote";
/*try {
    var lircd = fs.readFileSync(__dirname + "/assets/configurations/" + remote + "/lircd.conf");

    var keys = LircLib.getKeys(lircd.toString());
    console.log("Keys:", keys);
} catch(e) {
    console.log("Cannot open remote: " + remote, e);
}*/

var testRemoteFn = function(remote, cnt) {
    return function() {
        var lircd = fs.readFileSync(__dirname + "/assets/configurations/" + remote + "/lircd.conf");
        var keys = LircLib.getKeys(lircd.toString());
        assert.equal(keys.length, cnt);
    }
};

describe('LircLib', function() {
    describe('#getKeys()', function() {
        var remote = "Arcam ir-DAC-II Remote";
        it('should return 5 keys from ' + remote, testRemoteFn(remote, 5));

        remote = "Denon Remote RC-1104";
        it('should return 7 keys from ' + remote, testRemoteFn(remote, 7));

        remote = "JustBoom IR Remote";
        it('should return 12 keys from ' + remote, testRemoteFn(remote, 12));
    });
});
