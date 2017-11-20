import State from '@/domain/fsm/State';

function StartingNextHand(gameState) {
    State.call(this);

    // Full current game state to sync UI with
    this.gameState = gameState;
}

StartingNextHand.prototype = Object.create(State.prototype);
StartingNextHand.prototype.constructor = StartingNextHand;

StartingNextHand.prototype.enter = function() {

    State.prototype.enter.call(this);

    // Code here
    console.log("StartingNextHand enter")
    // Do full refresh of UI to match provided game state
    this.tableController.sync(this.gameState);

    this.pendingTableOperation = this.tableController.shuffleDeck()
    .then(() => {
        this.pendingTableOperation = null;
    })
    .catch((e) => {
        this.pendingTableOperation = null;
        throw e; // rethrow
    });

}

StartingNextHand.prototype.exit = function() {

    // Code here

    if (this.pendingTableOperation) {
        // We did not have enough time to do table operation
        console.warn("Call cancel on pendingTableOperation");
        this.pendingTableOperation.cancel();
        this.pendingTableOperation = null;
    }
    
    // Ensure shuffling animation is done ahd facecards in correct position
    this.tableController.forceAllFaceCardsToDeckPosition();

    State.prototype.exit.call(this);

}


export default StartingNextHand