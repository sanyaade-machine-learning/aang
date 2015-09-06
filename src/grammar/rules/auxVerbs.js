var g = require('../grammar')
var stopWords = require('./stopWords')

// (people who) are (followed by me)
exports.beNon1Sg = g.newSymbol('be', 'non', '1', 'sg')
exports.beNon1Sg.addWord({
	insertionCost: 1,
	accepted: [ 'are', 'were' ],
	substitutions: [ 'is|are|be being', 'being|been' ]
})

// (issues that are) <stop> (open/closed)
// (people who are) <stop> (followed by me)
exports.beNon1SgSentenceAdverbial = g.newBinaryRule({ RHS: [ exports.beNon1Sg, stopWords.sentenceAdverbial ] })

// (people who have) been (followed by me)
exports.bePast = g.newSymbol('be', 'past')
exports.bePast.addWord({
	insertionCost: 1,
	accepted: [ 'been' ]
})

// (pull requests I/{user}/[nom-users]) am/is/are (mentioned in)
exports.beGeneral = g.newSymbol('be', 'general')
exports.beGeneral.addVerb({
	insertionCost: 1,
	one: [ 'am' ],
	pl: [ 'are', 'were' ],
	oneOrPl: [ 'have been' ],
	threeSg: [ 'is', 'has been' ],
	oneOrThreeSg: [ 'was' ]
})

// (people who) have (been followed by me)
// - No past tense ('had') because it implies semantic no longer true; "had liked" -> no longer liked
exports.have = g.newSymbol('have')
exports.have.addVerb({
	insertionCost: 0.8,
	oneOrPl: [ 'have' ],
	threeSg: [ 'has' ],
	substitutions: [ 'had' ]
})

// (repos I) have <stop> (contributed to)
// No insertion to prevent semantically identical trees from being created, such as "repos I like" suggesting "repos I have liked".
exports.haveNoInsertPreVerbStopWords = g.newBinaryRule({ RHS: [ exports.have, stopWords.preVerb ], noInsertionsForIndexes: [ 0 ] })

// (people who have) <stop> (been folllowed by me); (people who have) <stop> (been following me)
var haveSentenceAdverbial = g.newBinaryRule({ RHS: [ exports.have, stopWords.sentenceAdverbial ], personNumber: 'pl' })
exports.haveSentenceAdverbialBePast = g.newBinaryRule({ RHS: [ haveSentenceAdverbial, exports.bePast ] })

// NEGATION:
exports.notSemantic = g.newSemantic({ name: 'not', cost: 0.5, minParams: 1, maxParams: 1 })

var negation = g.newSymbol('negation')
negation.addWord({
	accepted: [ 'not' ],
	substitutions: [ 'are|can|could|did|does|do|had|has|have|is|should|was|were|will|would not' ]
})

// (people who) do not (follow me)
var doTerm = g.newSymbol('do')
doTerm.addWord({
	insertionCost: 0.2,
	accepted: [ 'do' ],
	substitutions: [ 'did', 'does' ]
})
exports.doNegation = g.newBinaryRule({ RHS: [ doTerm, negation ] })

// (people who) are not followers of mine
// (issues that) are not (open)
// (people who) are not (follwed by me)
exports.beNon1SgNegation = g.newBinaryRule({ RHS: [ exports.beNon1Sg, negation ] })

// (people who) have not been (followed by me)
var haveNegation = g.newBinaryRule({ RHS: [ exports.have, negation ], personNumber: 'pl' })
exports.haveNegationBePast = g.newBinaryRule({ RHS: [ haveNegation, exports.bePast ] })