var g = require('../grammar')
var Category = require('./Category')
var stopwords = require('./stopWords')
var oneSg = require('./oneSg')
var preps = require('./prepositions')
var poss = require('./poss')


var user = new Category({ sg: 'user', pl: 'users', person: true })

var peopleTerm = g.addWord({
	name: 'people-term',
	insertionCost: 2.5,
	accepted: [ 'people', 'users' ]
})

this.github = g.addWord({
	name: 'github',
	accepted: [ g.emptyTermSym, 'GitHub' ] // opt (should I make specification for opt -> automatic?)
})

// |Github users (I follow)
user.head.addRule({ RHS: [ this.github, peopleTerm ] })


var userTerm = new g.Symbol(user.nameSg)
// (people) {user} (follows); (people who follow) {user}
userTerm.addRule({ terminal: true, RHS: '{user}' })


var nomUsers = new g.Symbol('nom', 'users')
// (repos) people who follow me (like)
nomUsers.addRule({ RHS: [ user.plural ], personNumber: 'oneOrPl' })
// (people) {user} (follows)
nomUsers.addRule({ RHS: [ userTerm ], personNumber: 'threeSg' })
// (people) I (follow)
nomUsers.addRule({ RHS: [ oneSg.plain ], gramCase: 'nom', personNumber: 'oneOrPl' })

this.nomUsersPlus = new g.Symbol('nom', 'users+')
this.nomUsersPlus.addRule({ RHS: [ nomUsers ] })


var objUser = new g.Symbol('obj', 'user')
// (people followed by) {user}; (people who follow) {user}
objUser.addRule({ RHS: [ userTerm ], personNumber: 'threeSg' })
// (people followed by) me; (people who follow) me
objUser.addRule({ RHS: [ oneSg.plain ], gramCase: 'obj' })

var objUsers = new g.Symbol('obj', 'users')
// (people who follow) me/{user}
objUsers.addRule({ RHS: [ objUser ] })
// (people who follow) people
objUsers.addRule({ RHS: [ user.plural ] })

var objUsersPlus = new g.Symbol('obj', 'users+')
objUsersPlus.addRule({ RHS: [ objUsers ] })

// (people followed) by me
this.byObjUsers = new g.Symbol('by', 'obj', 'users')
this.byObjUsers.addRule({ RHS: [ preps.agent, objUsersPlus ] })


// FOLLOW:
var follow = g.addVerb({
	name: 'follow',
	oneOrPl: [ 'follow', 'subscribe to' ],
	threeSg: [ 'follows' ],
	past: [ 'followed' ],
	substitutions: [
		'have followed',
		'following',
		'have|has|had been following',
		'am|is|are|were|was|be following',
		'subscribed to'
	]
})

// (people) followed by me
user.passive.addRule({ RHS: [ follow, this.byObjUsers ] })
// (people) I follow
var stopwordFollow = new g.Symbol('stopword', 'follow')
stopwordFollow.addRule({ RHS: [ stopwords.preVerbStopwords, follow ] })
user.objFilter.addRule({ RHS: [ this.nomUsersPlus, stopwordFollow ] })
// (people who) follow me
user.subjFilter.addRule({ RHS: [ follow, objUsersPlus ] })



var followersTerm = g.addWord({
	name: 'followers-term',
	accepted: [ 'followers' ]
})

// (my) followers
var userFollowersHead = new g.Symbol(user.nameSg, 'followers', 'head')
userFollowersHead.addRule({ RHS: [ this.github, followersTerm ] })

// (my) followers
var userFollowersPossessible = new g.Symbol(user.nameSg, 'followers', 'possessible')
userFollowersPossessible.addRule({ RHS: [ user.lhs, userFollowersHead ] })

// my followers
user.noRelativePossessive.addRule({ RHS: [ poss.determinerOmissible, userFollowersPossessible ] })

// followers of mine
user.head.addRule({ RHS: [ userFollowersHead, poss.ofPossUsers ] })