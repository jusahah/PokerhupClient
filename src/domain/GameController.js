
function GameController(tableController, network) {
    
    // Ref to TableController
    this.tableController = tableController;
    // Network
    this.network = network;

    // Own player ID
    this.myPlayerId = 'p1';

    // Current app state tree.
    this._stateTree = null;

    // Current action promise that is being fulfilled by Table
    this.currentTablePromise = null;

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

        //////////////////////////////////////
        /////////// Table updates ////////////
        //////////////////////////////////////

        if (msgFromServer.type === 'hand_preflop_deal') {

            // Get own cards
            var myCards = msgFromServer.cards[this.myPlayerId];

            // Call TableController
            this.tableController.dealHoleCards(myCards);

        } else if (msgFromServer.type === 'hand_flop_deal') {
            this.tableController.dealFlop(msgFromServer.hand.commonCards);
        }

        ///////////////////////////////////
        /////////// My actions ////////////
        ///////////////////////////////////

        else if (msgFromServer.type === 'hand_waiting_decision') {

            if (msgFromServer.toDecide === this.myPlayerId) {
                // My decision
                this.waitMyDecision(msgFromServer.decisions)
            } else {
                // Somebody else's decision
                this.waitOpponentDecision(msgFromServer.toDecide);
            }
        }

        
    }

    this.handUpdateReceived = function(handData) {

        this.tableController.forceHandUpdate(handData);

    }

    this.waitOpponentDecision = function(opponentId) {

        this.tableController.waitingForDecisionBy(opponentId);

    }

    this.waitMyDecision = function(decisionsAvailable) {
        
        this.currentTablePromise = this.tableController.askForDecision(decisionsAvailable);

        this.currentTablePromise.then((decisionMade) => {
            console.warn("GameController: Decision is " + decisionMade);
            // Send straight back to server.
            this.network.sendMsg({
                type: 'hand_decision_made',
                decision: decisionMade
            });

            this.currentTablePromise = null;

        })
        // Do timeout clause here?
        .catch((e) => {
            throw e; // Rethrow.
        })

    }

}

export default GameController;