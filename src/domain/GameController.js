// Game states
import WaitingNextHand from '@/domain/fsm/WaitingNextHand';
import StartingNextHand from '@/domain/fsm/StartingNextHand';
import WaitingGameStart from '@/domain/fsm/WaitingGameStart';

// Hand states
import WaitingMyDecision from '@/domain/fsm/hand/WaitingMyDecision';
import WaitingOpponentDecision from '@/domain/fsm/hand/WaitingOpponentDecision';
import Animating from '@/domain/fsm/hand/Animating'

function GameController(tableController, network) {
    
    // Ref to TableController
    this.tableController = tableController;
    // Network
    this.network = network;

    // Own player ID (in Game, will be given by server)
    this.myPlayerId = null;

    // Current app state tree.
    this._stateTree = null;
    // Current state
    this.currentState = null;

    // Current action promise that is being fulfilled by Table
    this.currentTablePromise = null;
    // Current waiting action ID
    // This is auto-inc int that tells whether some 
    // waited action has already been pre-empted/cancelled.
    this.currentTablePromiseId = 0;

    /// INITIALIZATION STUFF
    this.readyToPlay = function() {

        // Send info to server
        var msg = {
            type: 'init_done'
        };

        this.network.sendMsg(msg);

        this.tableController.hideDecisionButtons();

    }

    // DESTRUCTION STUFF
    this.onDestroy = function() {

    }

    /// SERVER MESSAGE GATEWAY
    this.serverMessageCb = function(msgType, msgFromServer, answerResolver) {

        console.warn("From server: " + msgType);
        console.warn(msgFromServer);

        if (msgType === 'settings_init') {
            this.myPlayerId = msgFromServer.playerNumber;
        }

        ///////////////////////////////////////
        /////////// HAND SYNC /////////////////
        ///////////////////////////////////////
        if (msgType === 'hand_init') {
            this.changeLocalState(new StartingNextHand(msgFromServer.world));
        }

        if (msgType === 'hand_ended') {
            var newStacks = msgFromServer.stacks;
            this.changeLocalState(new Animating('hand_end', newStacks));
        }

        //////////////////////////////////////
        /////////// Table updates ////////////
        //////////////////////////////////////

        if (msgType === 'hand_preflop_deal') {

            // Get own cards
            var myCards = msgFromServer.cards[this.myPlayerId];

            this.changeLocalState(new Animating('preflop_deal', myCards));

            // Call TableController
            // this.tableController.dealHoleCards(myCards);

        } else if (msgType === 'hand_flop_deal') {
            this.changeLocalState(new Animating('flop_deal', msgFromServer.communityCards));
            //this.tableController.dealFlop(msgFromServer.hand.commonCards);
        } else if (msgType === 'hand_turn_deal') {
            this.changeLocalState(new Animating('turn_deal', msgFromServer.communityCards));
            //this.tableController.dealFlop(msgFromServer.hand.commonCards);
        } else if (msgType === 'hand_river_deal') {
            this.changeLocalState(new Animating('river_deal', msgFromServer.communityCards));
            //this.tableController.dealFlop(msgFromServer.hand.commonCards);
        }


        ///////////////////////////////////
        /////////// My actions ////////////
        ///////////////////////////////////
        /*
        else if (msgType === 'hand_waiting_decision') {

            if (msgFromServer.toDecide === this.myPlayerId) {
                // My decision
                this.changeLocalState(new WaitingMyDecision(msgFromServer.decisions));
            } else {
                // Somebody else's decision
                this.changeLocalState(new WaitingOpponentDecision(msgFromServer.toDecide));
            }
        }
        */

        else if (msgType === 'decide') {
            this.changeLocalState(new WaitingMyDecision(
                msgFromServer.bets, 
                msgFromServer.decisions, 
                answerResolver
            ));
        }

        
    }

    this.handUpdateReceived = function(handData) {

        this.tableController.forceHandUpdate(handData);

    }

    /*
    this.waitOpponentDecision = function(opponentId) {

        this.tableController.waitingForDecisionBy(opponentId);

    }
    */

    ///////////////////////// STATE CHANGES //////////////////////////
    
    this.changeLocalState = function(state) {
        if (this.currentState) {
            this.currentState.exit();
            console.error("Exited state: " + this.currentState.constructor.name);
        }

        this.currentState = state;
        this.currentState.setupDeps(this, this.tableController, this.network);

        this.currentState.enter();
        console.error("Entered state: " + this.currentState.constructor.name);

    }

}

export default GameController;