var irc = require('irc'),
    moment = require('moment'),
    timezone = require('moment-timezone'),
    _ = require('lodash'),
    api = require('./API');

function IrcService() {
    
    var bot, lastMessageAt = moment(), nicks = [],
        local_time = timezone.tz('America/Chicago'),
        config = {
            userName: 'ExMoBot',
            nick: 'ExMoBot',
            realName: 'ExtremeModeration Twitch Bot',
            password: process.env.TWITCH_TOKEN,
            channels: ['#' + process.env.TWITCH_AUTO_JOIN_CHANNEL],
            secure: false,
            debug: false,
            announce: false,
            sendDelay: 15*60*1000,
            messageDelay: 10
        };
    
    function defaultChannel() {
        return config.channels[0];
    }
    
    function connect() {
        console.log('Time to get this party started!\nConnecting to ' + defaultChannel() + '...');
        bot = new irc.Client('irc.twitch.tv', config.nick, config);
        if (config.debug) {
            bot.addListener('raw', onRaw);
        }
        bot.addListener('message', onMessage);
        bot.addListener('join', onJoin);
        bot.addListener('part', onPart);
        bot.addListener('names', onListNames);
    }
    
    function disconnect(callback){
        bot.disconnect(callback);
    }
    
    function sendNicks() {
        api.viewers.sendNicks(nicks, function(result){
            console.log(result.body.message);
            setTimeout(sendNicks, config.sendDelay);
        });
    }
    
    function onListNames(channel, _nicks) {
        for (var nick in _nicks) {
            if (!_.includes(nicks, nick)) {
                nicks.push(nick);
            }
        }
        sendNicks();
    }
    
    function onMessage(from, to, text, message) {
        var elapsed_seconds = lastMessageAt.subtract(moment()).seconds();
        if (from !== config.nick && text[0] === '!' && text.length > 2 && elapsed_seconds > config.messageDelay) {
            var spaceIndex = text.indexOf(' ');
            
            if (spaceIndex < 0) {
                spaceIndex = text.length;
            }
            
            var command = text.toLowerCase().substring(1, spaceIndex);
            if (command.length > 2) {
                switch(command) {
                    case 'highfive':
                        from = targetUser(from, text);
                        bot.say(defaultChannel(), 'Slip me some skin ' + from + '!');
                        bot.say(defaultChannel(), '/me high fives ' + from + '!');
                        break;
                    case 'time':
                        bot.say(defaultChannel(), 'ExtremeModeration\'s time is currently ' + local_time.format('h:mm A'));
                        break;
                    case 'points':
                        from = targetUser(from, text);
                        api.viewers.getViewerPoints(from, function(viewer){
                            bot.say(defaultChannel(), from + ', you currently have ' + viewer.points + ' points.  Go you!');
                        });
                        break;
                }
            }
        }
        lastMessageAt = moment();
    }
    
    function onJoin(channel, nick, message) {
        if (config.announce && nick.toLowerCase() === config.nick.toLowerCase()) {
            bot.say(channel, config.nick + ' has arrived!');
        }
        
        if (!_.includes(nicks, nick)) {
            nicks.push(nick);
        }
    }
    
    function onPart(channel, nick) {
        var nickIndex = _.indexOf(nicks, nick);
        if (nickIndex >= 0) {
            nicks.splice(nickIndex, 1);
        }
    }
    
    function onRaw(message) {
        console.log(message);
    }
    
    function targetUser(from, text) {
        var spaceIndex = text.indexOf(' '),
            nick = from;
        if (spaceIndex > 0) {
            var _message = text.substring(spaceIndex+1,text.length);
            spaceIndex = _message.indexOf(' ');
            if (spaceIndex > 0) {
                _message = _message.substr(0, spaceIndex).trim()
            }
            
            for (var i=0; i < nicks.length; i++) {
                if (nicks[i].toLowerCase() === _message.toLowerCase()) {
                    nick = _message;
                    break;
                }
            }
        }
        
        return nick;
    }
    
    return {
        connect: connect,
        disconnect: disconnect
    };
    
}

module.exports = new IrcService();