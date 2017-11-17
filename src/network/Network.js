function Network(cb) {

    this.cb = cb;

    // Sketching API

    this.receiveMsg = function(cb) {
        this.cb = cb;
    }

    this.sendMsg = function(domainMsg) {

    }

}

export default Network;