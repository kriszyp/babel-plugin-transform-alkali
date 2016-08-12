var tests = {
  basic: function() {
    let num = react(3)
  },
  sum: function() {
    let sum = react(num + 5)
  },
  bool: function() {
    let bool = react(true)
    let f = react(!bool)
  },
  cond: function() {
    let cond = react(f ? num : sum)
  },
  call: function() {
    let result
    react(result = Math.min(num, sum))
  },
  boundGenerator: function() {
    react((function*() {
      test()
    }).bind(this))
  }
}
var test
for (var testName in tests) {
  var result = require("babel-core").transform('test=' + tests[testName].toString(), {
    plugins: ["transform-alkali"]
  })
  console.log('transformed', result.code)
  //eval(result.code)()
}

