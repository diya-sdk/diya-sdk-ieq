class StopCondition extends Error {
	constructor (msg) {
		super(msg)
		this.name = 'StopCondition'
	}
}
module.exports = StopCondition
