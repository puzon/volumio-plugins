
var ObjectUtils = {
    simpleArrayToObjectArray: function(arr, valName, labelName) {
        var ret = [];
        for(var i in arr) {
            var v = {};
            v[valName] = i;
            v[labelName] = arr[i];
            ret.push(v);
        }
        return ret;
    }
};

module.exports = ObjectUtils;