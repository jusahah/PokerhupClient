import State from '@/domain/fsm/State';

function Animating(animName, animData) {
    State.call(this);

    this.animName = animName;
    this.animData = animData;

    this.animationPromise = null;
}


Animating.prototype = Object.create(State.prototype);
Animating.prototype.constructor = Animating;

Animating.prototype.startAnimation = function() {

    console.warn("Animating: startAnimation " + this.animName)

    if (this.animName === 'flop_deal') {
        return this.tableController.dealFlop(this.animData);
    } else if (this.animName === 'turn_deal') {
        return this.tableController.dealTurn(this.animData[3]);
    } else if (this.animName === 'river_deal') {
        return this.tableController.dealRiver(this.animData[4]);
    }

    // Hole cards
    if (this.animName === 'preflop_deal') {
        return this.tableController.dealHoleCards(this.animData);
    }

    // End hand and gather cards
    if (this.animName === 'cards_to_deck') {
        return this.tableController.gatherCardsBackToDeck();
    }

    // Shuffling
    // Note that initial shuffle is being done in StartingNextHand
    if (this.animName === 'shuffle') {
        return this.tableController.shuffleDeck();
    }

}

Animating.prototype.enter = function() {
    // Start playing animation

    this.animationPromise = this.startAnimation();
}

Animating.prototype.exit = function() {
    // Stop playing animation and clear UI to stable state.


}

export default Animating