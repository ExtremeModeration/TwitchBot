var superagent = require('superagent');

function API() {
    
    var token = process.env.APP_TOKEN,
        secret = process.env.APP_SECRET,
        root = process.env.API_ROOT;
    
    function Viewers() {
        function sendNicks(nicks, callback) {
            superagent.put(root + '/v1/viewers')
                .set('client-token', token)
                .set('client-secret', secret)
                .send({viewers: nicks})
                .end(function(e, result){
                    if (e) return console.log(e);
                    if (callback) {
                        callback(result);
                    }
                });
        }
        return {
            sendNicks: sendNicks
        };
    }
    
    return {
        viewers: new Viewers()
    };
}

module.exports = new API();