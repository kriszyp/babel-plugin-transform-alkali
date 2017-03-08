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
    let cond = {
      condProp: react(f ? num : sum)
    }
  },
  call: function() {
    let result
    react(result = Math.min(num, sum))
  },
  object: function() {
    react({
      num,
      sum: sum * 2,
      three: 3
    })
  },
  array: function() {
    react(Math.max.apply(null, [num, 3, sum]))
  },
  boundGenerator: function() {
    react((function*() {
      var a = 3
      test(2 * num)
    }).bind(this))
  },
  decorator: `
  () => {
const VF = VArray.of(Foo)
class Foo {
  @reactive foo: {goo: VF[], noo: string, b: boolean, n: number, o: {}}
}
}`
}
var test
for (var testName in tests) {
  var result = require("babel-core").transform('test=' + tests[testName].toString(), {
    plugins: ["transform-alkali", 'transform-class-properties', 'transform-flow-strip-types']
  })
  console.log('transformed', result.code)
  //eval(result.code)()
}

