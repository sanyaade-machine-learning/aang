// Basic boolean operations

var g = require('../grammar')

exports.intersectSemantic = g.newSemantic({ name: 'intersect', cost: 0, minParams: 1, maxParams: 100 })
exports.unionSemantic = g.newSemantic({ name: 'union', cost: 0.5, minParams: 1, maxParams: 100 })

// conjunction
exports.and = new g.Symbol('and')
exports.and.addWord({
	insertionCost: 2,
	accepted: [ 'and' ]
})

// disjunction
exports.union = new g.Symbol('union')
exports.union.addWord({
	accepted: [ 'or' ]
})

// Create rules for "and" + "or" to surround 'symbol'
// Assign gloss property if passed; e.g., [nom-users]: (people) I and/or {user} follow
exports.addForSymbol = function (symbol, glossProperty) {
	// Append '+' to original symbol name
	var symbolNamePlus = symbol.name.slice(1, -1) + '+'

	// (people who follow) [obj-users]
	var symbolPlus = new g.Symbol(symbolNamePlus)
	symbolPlus.addRule({ RHS: [ symbol ] })

	// (people who follow) [obj-users] and [obj-users+]
	var andSymbolPlus = new g.Symbol('and', symbolNamePlus)
	andSymbolPlus.addRule({ RHS: [ exports.and, symbolPlus ] })
	var andRule = { RHS: [ symbol, andSymbolPlus ] }
	for (var gloss in glossProperty) {
		andRule[gloss] = glossProperty[gloss]
	}
	symbolPlus.addRule(andRule)

	// (people who follow) [obj-users] or [obj-users+]
	var orSymbolPlus = new g.Symbol('or', symbolNamePlus)
	orSymbolPlus.addRule({ RHS: [ exports.union, symbolPlus ] })
	var orRule = { RHS: [ symbol, orSymbolPlus ], semantic: exports.unionSemantic }
	for (var gloss in glossProperty) {
		orRule[gloss] = glossProperty[gloss]
	}
	symbolPlus.addRule(orRule)

	return symbolPlus
}