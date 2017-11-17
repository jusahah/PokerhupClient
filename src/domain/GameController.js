
function GameController(tableController) {
    
    // Ref to TableController
    this.tableController = tableController;

    // Current app state tree.
    this._stateTree = null;

    /// INITIALIZATION STUFF
    this.readyToPlay = function() {

    }

    /// SERVER MESSAGE GATEWAY
    this.serverMessageCb = function(msgFromServer) {

        // Dispatch here.
    }

}

export default GameController;