# babel-plugin-transform-alkali
This babel plugin will transform expressions that use a `react` keyword/call to produce reactive variables. This relies on [alkali](https://github.com/kriszyp/alkali) for variable operations that produce reactively bound variables.

## Installation

```sh
$ npm install babel-plugin-transform-alkali
```

## Usage

The basic format of using the transform is to write reactive expressions in the form:
```
react(expression)
```
The `react` variable should be imported from alkali. The `expression` will be transformed to code that will reactively respond to any changes in inputs values, reflecting them in the output variable. For example:
```
import { react } from 'alkali'
let a = react(2)
let b = react(4)
let sum = react(a + b)
sum.valueOf() -> 6
a.put(4)
sum.valueOf() -> 8
```
Reactive properties and assignments are supported as well. Property access within a reactive expression will be converted to a property variable (basically `obj.prop` -> `obj.property('prop')`, with object mappings and safety checks). And assignments within a reactive expression will be converted to a `put` call (basically `v = 'hi'` -> `v.put('hi')` with similar variable mapping/creation as necessary). For example:
```
let obj = react({
  foo: 3
})
let doubleFoo = react(obj.foo * 2)
doubleFoo.valueOf() -> 6
react(obj.foo = 5)
doubleFoo.valueOf() -> 10
```
The `react` operator returns alkali variables, that can be bound to DOM elements or any other alkali target.
```
import { react, Div } from 'alkali'
// create a div with its text bound to the sum
parent.appendChild(new Div(sum))
```
And the reactive expressions maintain operator relationships, so alkali's reversible data flow is supported as well:
```
let a = react(2)
let doubleA = react(a * 2)
react(doubleA = 10) // will flow back through the expression
a.valueOf() -> 5
```
The `react` function can take multiple arguments, the last argument output will be returned as the variable from the `react` call.

## Transform Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["transform-alkali"]
}
```

### Via CLI

```sh
$ babel --plugins transform-alkali
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["transform-alkali"]
});
```
