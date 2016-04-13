/**
 * Methods, which `grammar` inherits, that create `NSymbols` terminal rule sets.
 *
 * These methods which create an `NSymbol` are preferable to `NSymbol` instance methods that add the same terminal rule sets to an existing `NSymbol`. By not exposing the `NSymbol` (as easily), this abstraction seeks to prevent mixing these sets' rules with others on the same symbol.
 */

var util = require('../util/util')


/**
 * The inflections of a verb, from which `terminalRuleSetMethods.newVerb()` creates a terminal rule set where each rule in this set has as an object as its `text` with the properties `oneSg`, `threeSg`, `pl`, and `past`. When constructing parse trees, `pfsearch` conjugates this `text` object to the correct verb form (i.e., display text) according to grammatical properties in preceding nonterminal rules in the same tree.
 *
 * The person-number forms, `oneSg`, `threeSg`, and `pl`, are conjugated by the `personNumber` property in preceding nominative rules.
 *
 * The tense form, `past`, is conjugated by the `grammaticalForm` property in the (immediate) parent nonterminal rule. Also, if the parent rule has `acceptedTense` set to `past`, it accepts the `past` form when input, but does not conjugate to it otherwise (unlike `grammaticalForm`).
 *
 * The grammar generator and `pfsearch` do not use `presentSubjunctive`, `presentParticiple`, and `pastParticiple` for conjugation. Rather, they serve only to enforce complete definitions of verbs for complete substitution sets, replaced when input by one of the forms in the set with conjugation support.
 *
 * Note: It is much better to have a single terminal rule set with dynamic grammatical conjugation than to define separate rule sets with different display text for each grammatical case (depending on the rule), with the same substitutions/synonyms. The overhead `Parser` endures for the additional reductions because of the additional terminal rule matches is far greater than the `pfsearch` overhead for the conjugation.
 *
 * Note: Each of the verb forms becomes a terminal symbol, and can not contain whitespace.
 *
 * @typedef {Object} VerbFormsTermSet
 * @property {string} oneSg The first-person-singular verb form, chosen by the nonterminal rule property `personNumber`. E.g., "am", "was", "like".
 * @property {string} threeSg The third-person-singular verb form, chosen by the nonterminal rule property `personNumber`. E.g., "is", "was", "likes".
 * @property {string} pl The plural verb form, chosen by the nonterminal rule property `personNumber`. E.g., "are", "were" "like".
 * @property {string} past The past-tense verb form, chosen by the parent nonterminal rule property `grammaticalForm` and accepted when input by matching `acceptedTense`. E.g, "was", "liked", "did".
 * @property {string} [presentSubjunctive] The present-subjunctive verb form, substituted when input by one of the first four forms. E.g., "be".
 * @property {string} [presentParticiple] The present-participle verb form, substituted when input by one of the first four forms. E.g., "being", "liking".
 * @property {string} [pastParticiple] The past-participle verb form, substituted when input by one of the first four forms (and substituted by `past` if the parent rule has matching `acceptedTense`). E.g., "been", "done".
 */
var verbFormsTermSetSchema = {
	oneSg: { type: String, required: true },
	threeSg: { type: String, required: true },
	pl: { type: String, required: true },
	past: { type: String, required: true },
	presentSubjunctive: String,
	presentParticiple: String,
	pastParticiple: String,
}

/**
 * Creates an `NSymbol` that produces a terminal rule set for a verb with the necessary text forms for conjugation.
 *
 * Each terminal rule in the set has as an object as its `text` with the properties `oneSg`, `threeSg`, `pl`, and `past` for the various verb forms. When constructing parse trees, `pfsearch` conjugates the `text` object to the correct form (i.e., display text) according to grammatical properties in preceding nonterminal rules in the same tree.
 *
 * Note: Each of the verb forms in `options.verbForms` becomes a terminal symbol, and can not contain whitespace.
 *
 * @memberOf terminalRuleSetMethods
 * @param {Object} options The options object.
 * @param {string} options.symbolName The name for the returned `NSymbol`.
 * @param {number} [options.insertionCost] The insertion cost for the terminal rule set, assigned to the first rule in the set (i.e., `oneSg`). Enables the creation of insertion rules using the symbol that produces this set.
 * @param {VerbFormsTermSet} options.verbForms The verb terminal rule set with each verb form inflection.
 * @returns {NSymbol} Returns the `NSymbol` for the new verb terminal rule set.
 */
var verbSchema = {
	symbolName: { type: String, required: true },
	insertionCost: Number,
	verbFormsTermSet: { type: Object, required: true },
}

exports.newVerb = function (options) {
	if (util.illFormedOpts(verbSchema, options)) {
		throw new Error('Ill-formed verb')
	}

	var verbFormsTermSet = options.verbFormsTermSet
	if (util.illFormedOpts(verbFormsTermSetSchema, verbFormsTermSet)) {
		throw new Error('Ill-formed verb forms term set')
	}

	// Create the `NSymbol` that produces the verb terminal rule set.
	var verbSym = this.newSymbol(options.symbolName)

	// The terminal rule `text` object containing the verb inflections for use in conjugation for each terminal symbol in `verbFormsTermSet`.
	var verbTextForms = {
		oneSg: verbFormsTermSet.oneSg,
		threeSg: verbFormsTermSet.threeSg,
		pl: verbFormsTermSet.pl,
		past: verbFormsTermSet.past,
	}

	// The terminal rule for the first-person-singular verb form, chosen by the nonterminal rule property `personNumber`. E.g., "am", "was", "like".
	var oneSgTermRule = createVerbTerminalRule(verbFormsTermSet.oneSg, verbTextForms, 'present')
	if (options.insertionCost !== undefined) {
		// Assign the insertion cost, if any, to the first terminal rule in the set.
		oneSgTermRule.insertionCost = options.insertionCost
	}
	verbSym.addRule(oneSgTermRule)

	// The terminal rule for the third-person-singular verb form, chosen by the nonterminal rule property `personNumber`. E.g., "is", "was", "likes".
	verbSym.addRule(createVerbTerminalRule(verbFormsTermSet.threeSg, verbTextForms, 'present'))

	// The terminal rule for the the plural verb form, chosen by the nonterminal rule property `personNumber`. E.g., "are", "were" "like".
	// Check if distinguishable from the first-person-singular verb form; e.g., "like". Do not check if other verb forms are identical; rather, allow `NSymbol.prototype._newTerminalRule()` to throw the error for duplicate terminal symbols.
	if (verbFormsTermSet.pl !== verbFormsTermSet.oneSg) {
		verbSym.addRule(createVerbTerminalRule(verbFormsTermSet.pl, verbTextForms, 'present'))
	}

	// The terminal rule for the past-tense verb form, chosen by the parent nonterminal rule property `grammaticalForm` and accepted when input by matching `acceptedTense`. E.g, "was", "liked", "did".
	verbSym.addRule(createVerbTerminalRule(verbFormsTermSet.past, verbTextForms, 'past'))

	// If provided, the terminal rule for the present-subjunctive verb form, substituted when input by `verbTextForms`. E.g., "be".
	if (verbFormsTermSet.presentSubjunctive) {
		verbSym.addRule(createVerbTerminalRule(verbFormsTermSet.presentSubjunctive, verbTextForms, 'present'))
	}

	// If provided, the terminal rule for the present-participle verb form, substituted when input by `verbTextForms`. E.g., "being", "liking".
	if (verbFormsTermSet.presentParticiple) {
		verbSym.addRule(createVerbTerminalRule(verbFormsTermSet.presentParticiple, verbTextForms, 'present'))
	}

	// If provided, the terminal rule for the past-participle verb form, substituted when input by `verbTextForms` (and substituted by `past` if the parent rule has matching `acceptedTense`). E.g., "been", "done".
	if (verbFormsTermSet.pastParticiple) {
		verbSym.addRule(createVerbTerminalRule(verbFormsTermSet.pastParticiple, verbTextForms, 'past'))
	}

	// Save `verbTextForms` because it the identical `text` value for each terminal rule `verbSym` produces.
	verbSym.verbTextForms = verbTextForms

	// Assign terminal rule set properties to the `NSymbol` after adding all rules in the terminal rule set, else an exception is thrown.
	verbSym.isTermSet = true
	verbSym.termSetType = 'verb'

	return verbSym
}

/**
 * Creates a terminal rule for `terminalSymbol` as part of a verb rule set to pass to `NSymbol.prototype.addRule()`.
 *
 * For use by `terminalRuleSetMethods.newVerb()`.
 *
 * @private
 * @static
 * @param {string} terminalSymbol The terminal symbol without whitespace to match in input.
 * @param {Object} verbTextForms The terminal rule `text` object with all of a verb's forms for conjugation.
 * @param {string} tense The grammatical tense of `terminalSymbol`. Either 'present' or 'past'.
 * @returns {Object} Returns the new terminal rule, for which to pass to `NSymbol.prototype.addRule()`.
 */
function createVerbTerminalRule(terminalSymbol, verbTextForms, tense) {
	if (/.*\s.*/.test(terminalSymbol)) {
		util.logError('Verb terminal symbol contains whitespace:', util.stylize(terminalSymbol))
		throw new Error('Ill-formed verb terminal symbol')
	}

	if (tense !== 'present' && tense !== 'past') {
		util.logError('Unrecognized verb rule tense:', util.stylize(tense))
		throw new Error('Ill-formed verb')
	}

	var newVerbRule = {
		isTerminal: true,
		rhs: terminalSymbol,
		text: verbTextForms,
	}

	if (tense === 'past') {
		/**
		 * Define `tense` for use by the parent nonterminal rule property `acceptedTense`, which uses the verb form of the same tense when a terminal rule with identical `tense` is matched in input. Does not conjugate to that tense if not input unless the parent rule property `grammaticalForm` dictates as such.
		 *
		 * If this rule is a past-participle form, is matched in input, and the parent rule's `acceptedTense` matches `tense`, `pfsearch` substitutes this symbol for the verb set's simple past form, `verbTextForms.past`.
		 *
		 * If the entire verb set is a substitution set, this property maintains input tense for rules with `acceptedTense`. For example:
		 *   "repos I work on" -> "repos I contribute to"
		 *   "repos I worked on" -> "repos I contributed to" (maintained optional input tense)
		 */
		newVerbRule.tense = tense
	}

	return newVerbRule
}

/**
 * A terminal rule substitution for use in an invariable terminal rule set (i.e., does not support conjugation).
 *
 * @type {Object} SubstitutedTerm
 * @property {string} term The terminal symbol without whitespace to substitute when seen in input.
 * @property {number} costPenalty The substitution cost penalty.
 */
var substitutedTermSchema = {
	term: { type: String, required: true },
	costPenalty: { type: Number, required: true },
}

/**
 * Creates an `NSymbol` that produces a terminal rule set for uninflected (i.e., invariable) terms.
 *
 * Each terminal rule created from `options.acceptedTerms` has its term (i.e., the terminal symbol) as its `text` string, and each terminal rule created from `options.substitutedTerms`, if provided, has the first term in `options.acceptedTerms` has its `text` string. `pfsearch` does not attempt to conjugate these (invariable) terms.
 *
 * Note: Each of the strings in `options.acceptedTerms` and `options.substitutedTerms` becomes a terminal symbol, and can not contain whitespace.
 *
 * @memberOf terminalRuleSetMethods
 * @param {Object} options The options object.
 * @param {string} options.symbolName The name for the returned `NSymbol`.
 * @param {number} [options.insertionCost] The insertion cost for the terminal rule set, assigned to the first term in `options.acceptedTerms`. Enables the creation of insertion rules using the symbol that produces this set.
 * @param {string[]} options.acceptedTerms[] The uninflected terms accepted when input.
 * @param {(string|SubstitutedTerm)[]} [options.substitutedTerms[]] The uninflected terms substituted when input by the first term in `options.acceptedTerms`, defined with cost penalties (`SubstitutedTerm`) or without (`string`).
 * @returns {NSymbol} Returns the `NSymbol` for the new invariable terminal rule set.
 */
var termSchema = {
	symbolName: { type: String, required: true },
	insertionCost: Number,
	acceptedTerms: { type: Array, arrayType: String, required: true },
	substitutedTerms: { type: Array, arrayType: [ String, Object ] },
}

exports.newInvariableTerm = function (options) {
	if (util.illFormedOpts(termSchema, options)) {
		throw new Error('Ill-formed term')
	}

	// Create the `NSymbol` that produces the invariable terminal rule set.
	var termSym = this.newSymbol(options.symbolName)

	// Add a terminal rule for each uninflected term accepted when input.
	options.acceptedTerms.forEach(function (term, i) {
		if (/.*\s.*/.test(term)) {
			util.logError('Invariable term contains whitespace:', util.stylize(term))
			throw new Error('Ill-formed invariable term')
		}

		var termRule = {
			isTerminal: true,
			rhs: term,
			text: term,
		}

		// Assign the insertion cost, if any, to the first terminal rule in set.
		if (i === 0 && options.insertionCost !== undefined) {
			termRule.insertionCost = options.insertionCost
		}

		termSym.addRule(termRule)
	})

	// Add a terminal rules for each term that is substituted when input by the first term in `options.acceptedTerms`.
	if (options.substitutedTerms) {
		// The display text for the first terminal rule in the set substitutes the terminal symbols in `options.substitutedTerms` when input.
		var defaultText = options.acceptedTerms[0]

		options.substitutedTerms.forEach(function (term) {
			var costPenalty = 0
			if (term.constructor === Object) {
				if (util.illFormedOpts(substitutedTermSchema, term)) {
					throw new Error('Ill-formed term substitution')
				}

				// Assign substitution cost penalty, if any, to the terminal rule.
				costPenalty = term.costPenalty
				term = term.term
			}

			if (/.*\s.*/.test(term)) {
				util.logError('Invariable term contains whitespace:', util.stylize(term))
				throw new Error('Ill-formed invariable term')
			}

			termSym.addRule({
				isTerminal: true,
				rhs: term,
				text: defaultText,
				costPenalty: costPenalty,
			})
		})
	}

	// Assign terminal rule set properties to the `NSymbol` after adding all rules in the terminal rule set, else an exception is thrown.
	termSym.isTermSet = true
	termSym.termSetType = 'invariable'

	return termSym
}