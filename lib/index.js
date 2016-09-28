module.exports = function (config) {
	"use strict"
	const t = config.types
	const operators = {
		'+': 'add',
		'-': 'subtract',
		'*': 'multiply',
		'/': 'divide',
		'!': 'not',
		'%': 'remainder',
		'>': 'greater',
		'>=': 'greaterOrEqual',
		'<': 'less',
		'<=': 'lessOrEqual',
		'==': 'looseEqual',
		'===': 'equal',
		'&&': 'and',
		'||': 'or'
	}

	function getTempId(scope) {
		let id = scope.path.getData('functionBind');
		if (id) return id;

		id = scope.generateDeclaredUidIdentifier('context');
		return scope.path.setData('functionBind', id);
	}

	function getStaticContext(bind, scope) {
		let object = bind.object || bind.callee.object;
		return scope.isStatic(object) && object;
	}

	function markAsOutput(node) {
		node.isReactiveCompiled = true
		return node
	}

	var queuedIdentifiers = {}
	function retrieveReactively(path) {
		let node = path.node
		if (node.isReactiveCompiled) {
			return node
		} else if (node.type === 'Identifier') {
			return node
		} else {
			let visitorHandler = reactVisitors[node.type]

			if (visitorHandler) {
				if (visitorHandler(path) === false) {
					visitorHandler = false
				}
				node = path.node
			}
			if (!visitorHandler) {
				path.traverse(identifierVisitors)
				let identifierMap = queuedIdentifiers
				queuedIdentifiers = {}
				function getIdentifiers(input) {
					let identifiers = []
					for (let name in identifierMap) {
						identifiers.push(input ? identifierMap[name] : t.identifier(name))
					}
					return identifiers
				}
				if (getIdentifiers().length === 0) {
					// nothing referenced, nothing to do
					return node
				}
				node = markAsOutput(t.callExpression(
					markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('fcall'))),
					[t.arrowFunctionExpression(getIdentifiers(), node),
						t.arrayExpression(getIdentifiers(true))]))
				path.replaceWith(node)
			}
		}
		return node
	}

	const identifierVisitors = {
		Identifier(path) {
			let node = path.node
			if (!(path.parent.type === 'MemberExpression' && path.parent.property === node) &&
					!(node.name === 'react') &&
					!(node.isReactiveCompiled)) {
				queuedIdentifiers[node.name] = node
			}
		},
		MemberExpression(path) {
			let node = path.node
			if (node.isReactiveCompiled) {
				return
			}
			let replacedName = (node.object.name || 'temp') + (node.property.name || 'temp')
			queuedIdentifiers[replacedName] = markAsOutput(t.callExpression(
				markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('prop'))),
				[retrieveReactively(path.get('object')), node.computed ? retrieveReactively(path.get('property')) : t.stringLiteral(node.property.name)]))
			path.replaceWith(markAsOutput(t.identifier(replacedName)))
		},
		Statement(path) {
			throw new Error('Statements not allowed in reactive expressions')
		}
	}

	const reactVisitors = {
		AssignmentExpression(path) {
			let left = path.get('left')
			let right = path.get('right')
			if (t.isIdentifier(path.node.left)) {
				let assignee = retrieveReactively(left)
				path.replaceWith(markAsOutput(t.callExpression(
					t.memberExpression(
						t.conditionalExpression(
							t.logicalExpression('&&', assignee, t.memberExpression(assignee, t.identifier('put'))),
							assignee,
							t.assignmentExpression('=', assignee, t.callExpression(t.memberExpression(t.identifier('react'), t.identifier('from')), []))
						),
						t.identifier('put')
					), [retrieveReactively(right)])))
				return
			}
			path.replaceWith(markAsOutput(t.callExpression(
				t.memberExpression(left.node, t.identifier('put')), [retrieveReactively(right)])))
			retrieveReactively(path.get('callee').get('object')) // do the replacement afterwards, so we do get assignment error
		},
		MemberExpression(path) {
			let node = path.node
			if (node.isReactiveCompiled) {
				return
			}
			path.replaceWith(markAsOutput(t.callExpression(
				markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('prop'))),
				[retrieveReactively(path.get('object')), node.computed ? retrieveReactively(path.get('property')) : t.stringLiteral(node.property.name)])))
		},
		NewExpression(path) {
			return reactVisitors.CallExpression(path)
		},
		CallExpression(path) {
			let node = path.node
			let callee = node.callee
			if (node.isReactiveCompiled) {
				return
			}
			let reactiveArguments = []
			let args = path.get('arguments').forEach(arg => reactiveArguments.push(retrieveReactively(arg)))
			var argumentArray = t.arrayExpression(reactiveArguments)
			if (callee.type === 'MemberExpression') {
				path.replaceWith(markAsOutput(t.callExpression(
					markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('mcall'))),
					[callee.object, callee.computed ?
							retrieveReactively(path.get('callee').get('property')) :
							t.stringLiteral(callee.property.name),
						argumentArray])))
			} else {
				path.replaceWith(markAsOutput(t.callExpression(
					markAsOutput(t.memberExpression(t.identifier('react'), t.identifier(t.isNewExpression(node) ? 'ncall' : 'fcall'))),
					[callee, argumentArray])))
			}
		},
		BinaryExpression(path) {
			let operatorName = operators[path.node.operator]
			if (operatorName) {
				path.replaceWith(markAsOutput(t.callExpression(
					markAsOutput(t.memberExpression(t.identifier('react'), t.identifier(operatorName))),
					[retrieveReactively(path.get('left')), retrieveReactively(path.get('right'))])))
			} else {
				return false
			}
		},
		UnaryExpression(path) {
			let operatorName = operators[path.node.operator]
			if (operatorName) {
				path.replaceWith(markAsOutput(t.callExpression(
					markAsOutput(t.memberExpression(t.identifier('react'), t.identifier(operatorName))),
					[retrieveReactively(path.get('argument'))])))
			} else {
				return false
			}
		},
		LogicalExpression(path) {
			let operatorName = operators[path.node.operator]
			if (operatorName) {
				path.replaceWith(markAsOutput(t.callExpression(
					markAsOutput(t.memberExpression(t.identifier('react'), t.identifier(operatorName))),
					[retrieveReactively(path.get('left')), retrieveReactively(path.get('right'))])))
			} else {
				return false
			}
		},
		ConditionalExpression(path) {
			path.replaceWith(markAsOutput(t.callExpression(
				markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('cond'))),
				[retrieveReactively(path.get('test')), retrieveReactively(path.get('consequent')), retrieveReactively(path.get('alternate'))])))
		},
		ObjectExpression(path) {
			// react.obj((v1, v2) => ['static', v1, v2], [v1, v2])
			// we can keep it as an object
			path.get('properties').forEach(property => {
				retrieveReactively(property.get('value'))
			})
			var inputs = []
			var args = []
			let index = 0
			path.get('properties').forEach(property => {
				let node = retrieveReactively(property.get('value'))
				if (node.isReactiveCompiled || t.isIdentifier(node)) {
					property.get('value').replaceWith(t.identifier('v' + index))
					args.push(t.identifier('v' + index))
					inputs.push(node)
					index++
				}
			})
			if (index > 0) {
				let node = markAsOutput(t.callExpression(
					markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('obj'))),
					[t.arrowFunctionExpression(args, path.node),
						t.arrayExpression(inputs)]))
				path.replaceWith(node)
			}
		},
		ArrayExpression(path) {
			// react.obj((v1, v2) => ['static', v1, v2], [v1, v2])
			var transformedElements = []
			var inputs = []
			var args = []
			let index = 0
			path.get('elements').forEach(element => {
				let node = retrieveReactively(element)
				if (node.isReactiveCompiled || t.isIdentifier(node)) {
					transformedElements.push(t.identifier('v' + index))
					args.push(t.identifier('v' + index))
					inputs.push(node)
					index++
				} else {
					transformedElements.push(node)
				}
			})
			if (index > 0) {
				let node = markAsOutput(t.callExpression(
					markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('obj'))),
					[t.arrowFunctionExpression(args, t.arrayExpression(transformedElements)),
						t.arrayExpression(inputs)]))
				path.replaceWith(node)
			}
		},

		FunctionExpression() {
			// this basically exits out of the react transformation
			// TODO: if it is a fat arrow expression and the body is an expression, keep transforming
		}
	}

	return {
		visitor: {
			CallExpression(path) {
				let node = path.node
				let scope = path.scope
				let firstArg = node.arguments[0]
				let callee = node.callee
				if (callee.name === 'react' && firstArg) {
					//node.callee.name = 'react.from'// may not need this
					markAsOutput(node)
					path.get('callee').replaceWith(t.memberExpression(t.identifier('react'), t.identifier('from')))
					path.get('arguments').forEach(retrieveReactively)
					let name
					if (t.isAssignmentExpression(path.parent)) {
						name = path.parent.left.name
					}
					if (t.isVariableDeclarator(path.parent)) {
						name = path.parent.id.name
					}
					if (t.isProperty(path.parent)) {
						name = path.parent.key.name
					}
					if (name) {
						path.replaceWith(t.callExpression(t.memberExpression(path.node, t.identifier('_sN')), [t.stringLiteral(name)]))
					}
				}
			}
		}
	};
}
