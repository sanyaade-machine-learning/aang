/**
 * Utility functions for the test suite.
 */

var util = require('../util/util')
var cliui = require('cliui')
var testSuiteTags = require('./testTags')


/**
 * Maps `trees` to an array of their semantic strings (including disambiguated semantics).
 *
 * @static
 * @memberOf testUtil
 * @param {Object[]} [trees] The parse trees to map.
 * @returns {string[]} Returns the semantic stringss of `trees`.
 */
exports.mapTreesToSemantics = function (trees) {
	var semanticStrs = []

	if (trees) {
		for (var t = 0, treesLen = trees.length; t < treesLen; ++t) {
			var tree = trees[t]

			semanticStrs.push(tree.semanticStr)

			if (tree.ambiguousSemantics) {
				Array.prototype.push.apply(semanticStrs, tree.ambiguousSemantics)
			}
		}
	}

	return semanticStrs
}

/**
 * Gets the test with query `query` in `tests` if exists.
 *
 * Ignores case when comparing `query` values.
 *
 * @static
 * @memberOf testUtil
 * @param {Object[]} tests The tests to search.
 * @param {string} query The test query to match.
 * @returns {Object|undefined} Returns the test with query `query` if exists, else `undefined`.
 */
exports.findTest = function (tests, query) {
	var testIndex = exports.indexOfTest(tests, query)
	if (testIndex !== -1) {
		return tests[testIndex]
	}
}

/**
 * Gets the index at which the test with query `query` is found in `tests`.
 *
 * Ignores case when comparing `query` values.
 *
 * @static
 * @memberOf testUtil
 * @param {Object[]} tests The tests to search.
 * @param {string} query The test query to match.
 * @returns {number} Returns the index of the test with query `query` if exists, else -1.
 */
exports.indexOfTest = function (tests, query) {
	query = query.toLowerCase()
	for (var t = 0, testsLen = tests.length; t < testsLen; ++t) {
		var test = tests[t]
		if (test.query.toLowerCase() === query) {
			return t
		}
	}

	return -1
}

/**
 * Prints `test` to output, excluding the `semantics` values. For use by the `list` command.
 *
 * @static
 * @memberOf testUtil
 * @param {Object} test The test from the test suite to print.
 */
exports.printTest = function (test) {
	var query = test.query
	var topResult = test.topResult

	if (topResult) {
		if (topResult.text !== query) {
			var textDiff = util.diffStrings(query, topResult.text)
			util.log(textDiff.expected)
			util.log(textDiff.actual)
		} else {
			util.log(query)
		}

		util.log('  ', topResult.semantic)
	} else {
		util.log(query)
		util.log(util.colors.red('--not-input--'))
	}

	util.log('  ', util.colors.grey(test.description))

	if (test.tags.length > 0) {
		var tagHeading = 'tag' + (test.tags.length > 1 ? 's' : '') + ':'
		util.log('  ', util.colors.grey(tagHeading), util.colors.cyan.dim(test.tags.join(', ')))
	}
}

/**
 * Iterates over tests in `tests`, returning an array of all tests that contain a tag in `filterTags`. If `filterTags` contains a string not recognized as a tag in the test suite, exits the process with error code `1`.
 *
 * @static
 * @memberOf testUtil
 * @param {Object[]} tests The test suite.
 * @param {string[]} filterTags The tags by which filter.
 * @returns {Object[]} Returns the new, filtered array of tests.
 */
exports.filterTestsByTags = function (tests, filterTags) {
	// Check for unrecognized tags.
	for (var t = 0, tagsLen = filterTags.length; t < tagsLen; ++t) {
		var filterTagName = filterTags[t]
		if (!testSuiteTags[filterTagName]) {
			util.logError('Unrecognized test tag:', util.stylize(filterTagName))
			util.log()
			exports.printTags(tests)
			process.exit(1)
		}
	}

	var filteredTests = []

	// Adds tests to `filteredTests` that contain a tag in `filterTags`, while maintaining original order of `tests`.
	for (var t = 0, origTestLen = tests.length; t < origTestLen; ++t) {
		var test = tests[t]
		var testTags = test.tags

		for (var i = 0, testTagsLen = testTags.length; i < testTagsLen; ++i) {
			if (filterTags.indexOf(testTags[i]) !== -1) {
				filteredTests.push(test)
				break
			}
		}
	}

	return filteredTests
}

/**
 * Gets the test suite tags that apply to `test` and `parseResults`, the parse results for `test.query`.
 *
 * Invokes each validation functions in `testSuiteTags` with `test` and `parseResults` to determine which is  applicable. Each function inspects the test's input query, expected output, and parse results returned by `Parser.prototype.parse()` for parsing `test.query`.
 *
 * @static
 * @memberOf testUtil
 * @param {Object} test The test to check.
 * @param {Object} parseResults The parse results returned by `Parser.prototype.parse()` after parsing `test.query`.
 * @returns {string[]} Returns an array of the tags that apply to `test`.
 */
exports.getTagsForTest = function (test, parseResults) {
	var testTags = []

	for (var tagName in testSuiteTags) {
		if (testSuiteTags[tagName].appliesToTest(test, parseResults)) {
			testTags.push(tagName)
		}
	}

	return testTags
}

/**
 * Prints the names and descriptions of the tags in the test suite.
 *
 * @static
 * @memberOf testUtil
 */
exports.printTags = function () {
	util.log(util.colors.bold('Test Suite Tags:'))

	var tagsTable = cliui({
		width: 80,
		wrap: true,
	})

	for (var tagName in testSuiteTags) {
		tagsTable.div({
			text: tagName,
			width: 18,
			// 2 px left padding, 1 px bottom padding.
			padding: [ 0, 0, 1, 2 ],
		}, {
			text: testSuiteTags[tagName].description,
			// 1 px bottom padding.
			padding: [ 0, 0, 1, 0 ],
		})
	}

	util.log(tagsTable.toString())
}