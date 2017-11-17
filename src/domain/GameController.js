
function GameController(tableController, network) {
    
    // Ref to TableController
    this.tableController = tableController;
    // Network
    this.network = network;

    // Current app state tree.
    this._stateTree = null;

    /// INITIALIZATION STUFF
    this.readyToPlay = function() {

        // Send info to server
        var msg = {
            type: 'init_done'
        };

        this.network.sendMsg(msg);

    }

    // DESTRUCTION STUFF
    this.onDestroy = function() {

    }

    /// SERVER MESSAGE GATEWAY
    this.serverMessageCb = function(msgFromServer) {

        console.warn("From server: " + msgFromServer.type);

        if (msgFromServer.type === 'hand_waiting_decision' && msgFromServer.toDecide === 'p1') {
            console.warn("--- DECIDING ACTION... ---")

            _.delay(() => {
                this.network.sendMsg({
                    type: 'hand_decision_made',
                    decision: 'check'
                });
            }, 2000);
        }

        // Dispatch here.
    }

}

export default GameController;