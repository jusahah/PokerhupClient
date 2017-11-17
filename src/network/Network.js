function Network(cb) {

    this.cb = cb;

    // Sketching API

    this.receiveMsg = function(cb) {
        this.cb = cb;
    }

    this.sendMsg = function(domainMsg) {

    }

    this.setMsgGateway = function(cb) {
        this.cb = cb;
    }

}

export default Network;