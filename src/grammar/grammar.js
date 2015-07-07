var util = require('../util')


var symbol = require('./symbol')
exports.newSymbol = symbol.new
exports.newBinaryRule = symbol.newBinaryRule
exports.hyphenate = symbol.hyphenate
var grammar = symbol.grammar

exports.startSymbol = exports.newSymbol('start')

// Empty-string
// Rules with <empty> optionalize their LHS symbols and subsequent unary reductions
// Original rules with <empty> are omitted from output grammar
exports.emptySymbol = '<empty>'

// Integers in input
// Terminal rules with <int> are assigned minimum and maximum values
exports.intSymbol = '<int>'

// Extend Symbol with rule functions
require('./ruleFunctions')

// Extend module with semantic functions
var semantic = require('./semantic')
exports.newSemantic = semantic.newSemantic
exports.insertSemantic = semantic.insertSemantic

// Extend module with entity-category functions
var entityCategory = require('./entityCategory')
exports.newEntityCategory = entityCategory.newEntityCategory

// Derive rules from insertion and transposition costs, and empty-strings
exports.createEditRules = require('./createEditRules')

// Check for unused nonterminal symbols, entity categories, or semantic functions and arguments not used in any productions
exports.checkForUnusedComponents = require('./checkForUnusedComponents').bind(null, grammar)

// Sort nonterminal symbols alphabetically
exports.sortGrammar = function () {
	Object.keys(grammar).sort().forEach(function (symbolName) {
		var rules = grammar[symbolName]
		delete grammar[symbolName]
		grammar[symbolName] = rules
	})
}

// Print the total count of rules in the grammar
// Print change if 'oldGrammarPath' passed
exports.printRuleCount = function (outputFilePath) {
	var fs = require('fs')

	var newRuleCount = exports.ruleCount(grammar)

	if (fs.existsSync(outputFilePath)) {
		var oldRuleCount = exports.ruleCount(require(fs.realpathSync(outputFilePath)).grammar)
		if (oldRuleCount !== newRuleCount) {
			console.log('Rules:', oldRuleCount, '->', newRuleCount)
			return
		}
	}

	console.log('Rules:', newRuleCount)
}

// Return number of rules in grammar
exports.ruleCount = function (grammar) {
	return Object.keys(grammar).reduce(function (prev, cur) {
		return prev + grammar[cur].length
	}, 0)
}

// Write grammar and semantics to files
exports.writeGrammarToFile = function (outputFilePath) {
	util.writeJSONFile(outputFilePath, {
		grammar: grammar,
		semantics: semantic.semantics,
		entities: entityCategory.entities
	})
}