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
            debug: debugEnabled(),
            announce: false,
            sendDelay: 15*60*1000,
            messageDelay: 10
        };

    function debugEnabled() {
      var _pDebug = process.env.BOT_DEBUG;
      return ((_pDebug === true || _pDebug === "true") && _pDebug !== "false");
    }

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
                        var _from = targetUser(from, text);
                        if (!_from || !isViewerHere(_from)) _from = from;

                        bot.say(defaultChannel(), 'Slip me some skin ' + _from + '!');
                        bot.say(defaultChannel(), '/me high fives ' + _from + '!');
                        break;
                    case 'time':
                        bot.say(defaultChannel(), 'ExtremeModeration\'s time is currently ' + local_time.format('h:mm A'));
                        break;
                    case 'points':
                        var _from = targetUser(from, text);
                        if (!_from || !isViewerHere(_from)) _from = from;
                        api.viewers.getViewerPoints(_from, function(viewer){
                            bot.say(defaultChannel(), _from + ', you currently have ' + viewer.points + ' points.  Go you!');
                        });
                        break;
                    case 'pointsforall':
                    case 'makeitrain':
                        if (from.toLowerCase() === 'extrememoderation') {
                            api.viewers.sendNicks(nicks, function(result){
                                bot.say(defaultChannel(), 'You get a point! And you get a point! Everyone gets a point!');
                            });
                        }
                        break;
                    case 'song':
                    case 'nowplaying':
                        break;
                    case 'flipcoin':
                        var side = Math.floor((Math.random() * 2) + 1);
                        var coinSide = side === 1 ? 'heads' : 'tails';
                        bot.say(defaultChannel(), '/me flips a coin; This time it lands ' + coinSide + ' up.');
                        break;
                    case 'fight':
                        var opponent = targetUser(from, text);
                        var self = !opponent || opponent.toLowerCase() === from.toLowerCase();
                        var opponentIsHere = !self && opponent && isViewerHere(opponent);

                        if (self) {
                            bot.say(defaultChannel(), '/me watches as ' + from + ' fights with themselves. Who\'s going to win this time?');
                        } else if (opponentIsHere) {
                            var winner = Math.floor((Math.random() * 2) + 1) === 1 ? from : opponent;
                            bot.say(defaultChannel(), '/me watches as ' + from + ' picks a fight with ' + opponent + '... This time ' + winner + ' comes out on top!');
                        } else {
                            bot.say(defaultChannel(), from + ', if you want to pick a fight, you should probably choose someone who\'s actually here!');
                        }

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
        text = text.trim();
        var spaceIndex = text.indexOf(' '),
            nick;
        if (spaceIndex > 0) {
            var _message = text.substring(spaceIndex+1,text.length);
            spaceIndex = _message.indexOf(' ');
            if (spaceIndex > 0) {
                _message = _message.substr(0, spaceIndex).trim()
            }

            nick = _message;
        }

        return nick;
    }

    function isViewerHere(nick) {
        return _.includes(nicks, nick);
    }

    return {
        connect: connect,
        disconnect: disconnect
    };

}

module.exports = new IrcService();
