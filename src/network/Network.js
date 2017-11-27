import io from 'socket.io-client';

function Network(cb) {

    this.cb = cb;
    this.socket = null;

    // Sketching API

    this.connect = function() {
        // Move connection address and port to env var later
        this.socket = io('http://localhost:8070');
        console.warn("Connected to server");

        this.socket.on('msg', this.receiveMsgFromServer.bind(this));
        this.socket.on('disconnect', this.disconnected.bind(this));
    }

    this.disconnected = function() {
        console.warn("Client disconnected from server!");
    }

    this.receiveMsgFromServer = function(msg) {
        if (this.cb) {
            return this.cb(msg);
        }

        console.error("No msg handler in Network component!");
        return false;
    }

    this.receiveMsg = function(cb) {
        this.cb = cb;
    }

    this.sendMsg = function(domainMsg) {
        if (this.socket) {
            this.socket.emit('msg', domainMsg);
            
        } else {
            console.warn("Msg to server not sent - no connection yet");
        }

    }

    this.setMsgGateway = function(cb) {
        this.cb = cb;
    }

}

export default Network;