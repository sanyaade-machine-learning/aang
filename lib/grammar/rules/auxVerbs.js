var g = require('../grammar')
var stopWords = require('./stopWords')
var negation = require('./negation')
var beVerb = require('./beVerb')


exports.notSemantic = negation.semantic
// The default rule set for "not", with all "not" stop-words.
// (people) not (followed by me)
exports.negation = negation.symbol

var beParticiple =  g.newTermSequence({
	symbolName: g.hyphenate('be', 'participle'),
	type: g.termTypes.INVARIABLE,
	acceptedTerms: [ 'being', 'been' ],
})

// (people who) are (followed by me)
exports.bePl = g.newTermSequence({
	symbolName: g.hyphenate('be', 'pl'),
	type: g.termTypes.INVARIABLE,
	insertionCost: 1,
	acceptedTerms: [ 'are', 'were' ],
	substitutedTerms: [
		// Note: Unsure about these substitution (as well as the rule set altogether). Will be replaced.
		[
			g.newTermSequence({
				symbolName: g.hyphenate('be', 'pl', 'substituted', 'forms'),
				type: g.termTypes.INVARIABLE,
				acceptedTerms: [ 'is', 'are', 'be' ],
			}),
			beParticiple,
		],
		beParticiple,
	],
})

// (issues that are) <stop> (open/closed)
// (people who are) <stop> (followed by me)
exports.bePlSentenceAdverbial = g.newBinaryRule({
	rhs: [
		exports.bePl,
		{
			symbol: stopWords.sentenceAdverbial,
			// Prevent display text for `stopWords.sentenceAdverbial` and its descendants, yielding stop sequence behavior.
			noText: true,
			// Add a unary rule with only `exports.bePl` (where `stopWords.sentenceAdverbial` need not be matched).
			isOptional: true,
			// Prevent insertion of `stopWords.sentenceAdverbial`. This option is redundant because `createInsertionRules` would discard any such insertion rule for costing more than the identical rule `isOptional`.
			noInsert: true,
		},
	],
})

// (issues that) are not (open)
// (people who) are not (followers of mine)
// (people who) are not (followed by me)
exports.bePlNegation = g.newBinaryRule({
	rhs: [ exports.bePl, negation.createRuleSet(exports.bePl) ],
})


// (people who) have (been followed by me)
exports.have = g.newVerb({
	symbolName: 'have',
	insertionCost: 0.8,
	verbFormsTermSet: {
		oneSg: 'have',
		threeSg: 'has',
		pl: 'have',
		past: 'had',
		presentParticiple: 'having',
	},
})


// (people who have) been (followed by me)
var termBeen = g.newTermSequence({
	symbolName: g.hyphenate('term', 'been'),
	type: g.termTypes.INVARIABLE,
	insertionCost: 1,
	acceptedTerms: [ 'been' ],
	substitutedTerms: [ 'be' ],
})


// (people who) have <stop> (been followed by me)
exports.haveSentenceAdverbialBeen = g.newBinaryRule({
	rhs: [
		[ {
				symbol: exports.have,
				// Dictates inflection of `[have]`:
				//   "(people who) `[have]` (been ...)" -> "(people who) have (been ...)"
				grammaticalForm: 'infinitive',
			}, {
				symbol: stopWords.sentenceAdverbial,
				// Prevent display text for `stopWords.sentenceAdverbial` and its descendants, yielding stop sequence behavior.
				noText: true,
				// Add a unary rule with only `exports.have` (where `stopWords.sentenceAdverbial` need not be matched).
				isOptional: true,
				// Prevent insertion of `stopWords.sentenceAdverbial`. This option is redundant because `createInsertionRules` would discard any such insertion rule for costing more than the identical rule `isOptional`.
				noInsert: true,
		} ],
		termBeen,
	],
})


// Matches every "be" form of either tense in input, and conjugates to the correct form in the matched tense.
exports.be = g.newSymbol('be')
// (issues I) am/was (mentioned in)
exports.be.addRule({
	rhs: [ beVerb.noTense ],
})
// (issues I) have been (mentioned in)
exports.be.addRule({
	rhs: [ {
		symbol: exports.have,
		/**
		 * No insertion for `[have]` to prevent creating multiple semantically identical trees, where this suggestion would be discarded for its higher cost. For example, were the insertion of `[have]` enabled, it would enable the following additional, wasteful suggestion:
		 *   Stop: "(issues I) am (...)" -> "(issues I) have been (...)"
		 * This restriction also limits insertion of this entire LHS symbol, `[be]`, to its first rule: `[be-no-tense]`:
		 *   "(issues I) (mentioned in)"
		 *   -> "(issues I) am (mentioned in)"
		 *   -> Stop: "(issues I) have been (mentioned in)"
		 */
		noInsert: true,
	}, {
		symbol: beVerb.pastWithSubstitutedPresentForms,
		// Dictates inflection of `[be-past-with-substituted-present-forms]`:
		//   "(issues I)" have `[be]` (...)" -> "(issues I)" have been (...)"
		grammaticalForm: 'participle',
	} ],
})

// Matches every "be" form of either tense in input, and conjugates to the correct form in the matched tense.
exports.beNegation = g.newSymbol('be', 'negation')
// (issues I) am/was not (mentioned in)
exports.beNegation.addRule({
	rhs: [ beVerb.noTense, negation.term ],
})
// (issues I) have not been (mentioned in)
exports.beNegation.addRule({
	rhs: [
		g.newTermSequenceBinarySymbol({
			type: g.termTypes.VERB,
			termPair: [ exports.have, negation.term ],
		}), {
			symbol: beVerb.pastWithSubstitutedPresentForms,
			// Dictates inflection of `[be-past-with-substituted-present-forms]`:
			//   "(issues I)" have not `[be]` (...)" -> "(issues I)" have not been (...)"
			grammaticalForm: 'participle',
	} ],
})


var haveNotStopWordNegation = negation.createRuleSet(exports.have)

/**
 * (people I) have not (followed)
 * (repos `{user}`) has not (liked)
 * (people who) have not (liked my repos)
 *
 * Prevent `[have]` insertion to prevent `pfsearch` from wastefully creating multiple semantically identical trees, which it ultimately discard. For example, were this insertion enabled, it would yield the following semantically duplicate suggestions:
 *   Stop:  "(people who) not like" -> "(people who) do not like", "(people who) have not liked"
 *
 * Note: Refactor with `g.newTermSequenceBinarySymbol()` once the method supports `noInsertionIndexes`.
 */
exports.haveNoInsertNegation = g.newTermSequence({
	symbolName: g.hyphenate(exports.have.name, 'no', 'insert', haveNotStopWordNegation.name),
	type: g.termTypes.VERB,
	acceptedTerms: [
		{
			term: [ exports.have, haveNotStopWordNegation ],
			noInsertionIndexes: [ 0 ],
		},
	],
})

// (repos that) have not been (liked by me)
exports.haveNegationBeen = g.newBinaryRule({
	rhs: [
		// Note: Could make this rule a term sequence and move `grammaticalForm` to the outer rule, but then `[have]` is not conjugated in the insertion text of the insertion rule created from this inner binary rule.
		[ {
				// Enable `[have]` insertion for the following suggestion:
				//   "(repos that) not (been ...)" -> "(repos that) have not (been ...)"
				symbol: exports.have,
				// Dictates inflection of `[have]`:
				//   "(people who) `[have]` not (been ...)" -> "(people who) have not (been ...)"
				grammaticalForm: 'infinitive',
			},
			haveNotStopWordNegation,
		],
		termBeen,
	],
})

var doVerb = g.newVerb({
	symbolName: 'do',
	insertionCost: 0.2,
	verbFormsTermSet: {
		oneSg: 'do',
		threeSg: 'does',
		pl: 'do',
		past: 'did',
		presentParticiple: 'doing',
		// Note: Could integrate `[have]` as a leading stop-word:
		//   "(repos `{user}`) has done (not created)" -> "(repos `{user}`) did (not create)"
		pastParticiple: 'done',
	},
})

// (people I) do not (follow)
// (people who) did not (...)
// (repos/pull-requests I) did not (create)
exports.doNegation = g.newTermSequenceBinarySymbol({
	type: g.termTypes.VERB,
	termPair: [ doVerb, negation.createRuleSet(doVerb) ],
})

// (issues that) do not have (`<int>` comments)
exports.doPresentNegationHave = g.newBinaryRule({
	rhs: [ {
		symbol: exports.doNegation,
		// Dictates inflection of `[do]`
		//   "(issues that) `[do]` not have (...)" -> "(issues that) do not have (...)"
		grammaticalForm: 'infinitive'
	}, {
		symbol: exports.have,
		// Dictates inflection of `[have]`
		//   "(issues that) do not `[have]` (...)" -> "(issues that) do not have (...)"
		grammaticalForm: 'infinitive'
	} ],
})