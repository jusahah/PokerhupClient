import StateAlreadyDead from '@/domain/exceptions/StateAlreadyDead'

function State() {

    this.gameController = null;
    this.tableController = null;
    this.network = null;

    // Whether State already died (this is needed for any listeners bound
    // to this state object behaving correctly)
    this.stateAlive = true;

    this.pendingTableOperation = null;


}

State.prototype.setupDeps = function(gameController, tableController, network) {
    this.gameController = gameController;
    this.tableController = tableController;
    this.network = network;
}

// To be overwritten
State.prototype.enter = function() {
    this.stateAlive = true;
}

State.prototype.exit = function() {
    this.stateAlive = false;
}

State.prototype.checkStateStillAlive = function() {
    if (!this.stateAlive) {
        throw new StateAlreadyDead();
    }
}

export default State