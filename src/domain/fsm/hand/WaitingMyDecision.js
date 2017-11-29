import State from '@/domain/fsm/State';

// Exceptions
import StateAlreadyDead from '@/domain/exceptions/StateAlreadyDead'

function WaitingMyDecision(currentBetsOnTable, decisionsAvailable, answerResolver) {
    State.call(this);

    // whether while we've been waiting rest of the app already moved on
    // with its life.

    // Promise object waiting for UI to send us decision
    this.decisionPromise = null;

    this.answerResolver = answerResolver;

    this.decisionsAvailable = decisionsAvailable;
    this.currentBetsOnTable = currentBetsOnTable;
}


WaitingMyDecision.prototype = Object.create(State.prototype);
WaitingMyDecision.prototype.constructor = WaitingMyDecision;

WaitingMyDecision.prototype.decide = function() {

}

WaitingMyDecision.prototype.enter = function() {

    State.prototype.enter.call(this);

    // Setup UI
    this.tableController.updateBetsOnTable(this.currentBetsOnTable);
    this.decisionPromise = this.tableController.askForDecision(this.decisionsAvailable);

    this.decisionPromise
    .tap(this.checkStateStillAlive.bind(this))
    .then(function(decisionMade) {
        console.warn("WaitingMyDecision: Decision is " + decisionMade);
        // Send straight back to server.
        /*
        this.network.sendMsg({
            type: 'hand_decision_made',
            decision: decisionMade
        });
        */
        this.answerResolver(decisionMade);

        this.decisionPromise = null;

    }.bind(this))
    .catch(StateAlreadyDead, function(e) {
        // Do nothing
        console.warn("WaitingMyDecision state already died - do nothing");
    }) 
    // Do timeout clause here?
    .catch(function(e) {
        throw e; // Rethrow.
    })    


}

WaitingMyDecision.prototype.exit = function() {

    State.prototype.exit.call(this);

    // Clear UI
    this.tableController.hideDecisionButtons();

    // Destroy promise
    this.decisionPromise = null;

}

export default WaitingMyDecision