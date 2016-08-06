module.exports = function ({ types: t }) {

  const operators = {
    '+': 'add',
    '-': 'subtract',
    '>': 'gt',
  }
  function getTempId(scope) {
    let id = scope.path.getData("functionBind");
    if (id) return id;

    id = scope.generateDeclaredUidIdentifier("context");
    return scope.path.setData("functionBind", id);
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
    let { node } = path
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
          markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('expr'))),
          [t.arrayExpression(getIdentifiers(true)),
            t.arrowFunctionExpression(getIdentifiers(), node)]))
        path.replaceWith(node)
      }
    }
    return node
  }

  function visitExpression({expressions, exit}) {
    return {
      enter(path) {
        expression.forEach(expression => 
          path.get(expression).traverse())
        getExpressions().forEach(node => {

        })
      },
      exit(path) {
        if (path.node.isReactiveCompiled) {
          return
        }
        return exit(path)
      }
    }
  }

  const identifierVisitors = {
    Identifier(path) {
      let { node } = path
      if (!(path.parent.type === 'MemberExpression' && path.parent.property === node) &&
          !(node.name === 'react') &&
          !(node.isReactiveCompiled)) {
        queuedIdentifiers[node.name] = node
      }
    },
    MemberExpression(path) {
      let { node } = path
      if (node.isReactiveCompiled) {
        return
      }
      let replacedName = (node.object.name || 'temp') + (node.property.name || 'temp')
      queuedIdentifiers[replacedName] = markAsOutput(t.callExpression(
        markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('prop'))),
        [retrieveReactively(path.get('object')), node.computed ? retrieveReactively(path.get('property')) : t.stringLiteral(node.property.name)]))
      path.replaceWith(markAsOutput(t.identifier(replacedName)))
    }
  }

  const reactVisitors = {
    AssignmentExpression(path) {
      let left = path.get('left')
      let right = path.get('right')
      path.replaceWith(markAsOutput(t.callExpression(
        markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('assign'))),
        [left, retrieveReactively(right)])))
    },
    MemberExpression(path) {
      let { node } = path
      if (node.isReactiveCompiled) {
        return
      }
      path.replaceWith(markAsOutput(t.callExpression(
        markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('prop'))),
        [retrieveReactively(path.get('object')), node.computed ? retrieveReactively(path.get('property')) : t.stringLiteral(node.property.name)])))
    },
    CallExpression(path) {

      let { node } = path
      let callee = node.callee
      if (node.isReactiveCompiled) {
        return
      }
      if (callee.type === 'MemberExpression') {
        path.replaceWith(markAsOutput(t.callExpression(
          markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('mcall'))),
          [callee.object, callee.computed ? callee.property : t.stringLiteral(callee.property.name), node.arguments])))
      } else {
        path.replaceWith(markAsOutput(t.callExpression(
          markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('call'))),
          [callee, node.arguments])))
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
    ConditionalExpression(path) {
      path.replaceWith(markAsOutput(t.callExpression(
        markAsOutput(t.memberExpression(t.identifier('react'), t.identifier('cond'))),
        [retrieveReactively(path.get('test')), retrieveReactively(path.get('consequent')), retrieveReactively(path.get('alternate'))])))
    }
  }

  return {
    visitor: {
      CallExpression(path) {
        let { node, scope } = path
        let firstArg = node.arguments[0]
        let callee = node.callee
        if (callee.name === 'react' && firstArg && !(firstArg.type === 'FunctionExpression' && firstArg.generator)) {
          node.callee.name = 'react.from'// may not need this
          markAsOutput(node)
          path.get('arguments').forEach(retrieveReactively)
        }       
      }
    }
  };
}