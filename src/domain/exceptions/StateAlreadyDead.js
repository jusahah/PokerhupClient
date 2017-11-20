function StateAlreadyDead(sMessage) {
    this.name = "StateAlreadyDead";
    this.message = sMessage;
    this.stack = (new Error()).stack;
}

StateAlreadyDead.prototype = Object.create(Error.prototype);
StateAlreadyDead.prototype.constructor = StateAlreadyDead;

export default StateAlreadyDead