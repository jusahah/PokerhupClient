import io from 'socket.io-client';
import Promise from 'bluebird';

function Network(welcomeCb) {

    this.welcomeCb = welcomeCb;
    this.cb = null;
    this.socket = null;

    this.settings = null;

    this.pendingAnswers = [];

    // Sketching API

    this.connect = function() {
        // Move connection address and port to env var later
        console.log("Connecting to server in Network")
        console.log('Connecting: http://' + process.env.SERVER_ADDR + ':' + process.env.SOCKET_PORT);
        this.socket = io('http://' + process.env.SERVER_ADDR + ':' + process.env.SOCKET_PORT);
        console.warn("Connected to server");
        this.socket.on('welcome', this.receiveWelcome.bind(this));
        this.socket.on('settings', this.receiveSettings.bind(this));
        this.socket.on('msg', this.receiveMsgFromServer.bind(this));
        this.socket.on('disconnect', this.disconnected.bind(this));
    }

    this.receiveWelcome = function(welcomeMsg) {
        var serverVersion = welcomeMsg.serverVersion;

        this.welcomeCb(serverVersion);

        // Reset after
        this.welcomeCb = null;


    }

    this.disconnected = function() {
        console.warn("Client disconnected from server!");
    }

    this.disconnect = function() {

        if (this.socket) {
            this.socket.disconnect();
        }
    }

    this.receiveSettings = function(settings) {

        // Clear settings receiver afterwards.

        console.log("My settings");
        console.log(settings);

        this.settings = settings;

        if (this.cb) {
            this.cb('settings_init', settings);
        }

    }

    this.getOwnPlayerId = function() {
        return this.settings.playerNumber;
    }

    this.receiveMsgFromServer = function(msg) {
        if (this.cb) {
            console.error("Handling msg " + msg.type);
            console.log(msg.msg);

            // If msg expects answer, its answerId is not null or zero.
            var answerId = msg.answerId;

            if (answerId) {
                console.warn("Server msg expects answer: " + answerId);

                var prom = new Promise(function(resolve, reject) {
                    this.cb(msg.type, msg.msg, resolve);
                }.bind(this))
                .then(function(answerObject) {
                    console.log("Sending answer back to server!");
                    this.sendMsg(answerObject, answerId);
                }.bind(this))
                .finally(function() {
                    console.log("Removing answer resolver from pendingAnswers");
                    _.remove(this.pendingAnswers, function(p) {return p === prom});
                }.bind(this));

                this.pendingAnswers.push(prom);

                return;

            }
            return this.cb(msg.type, msg.msg, null);
        }

        console.error("No msg handler in Network component!");
        return false;
    }

    this.receiveMsg = function(cb) {
        this.cb = cb;
    }

    this.sendMsg = function(domainMsg, answerTo) {

        console.log("Sending msg back to server: ");
        console.log(domainMsg);

        if (this.socket) {

            this.socket.emit('msg', {
                msg: domainMsg,
                answerTo: answerTo || 0
            });
            
        } else {
            console.warn("Msg to server not sent - no connection yet");
        }

    }

    this.setMsgGateway = function(cb) {
        this.cb = cb;
    }

}

export default Network;