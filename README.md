# babel-plugin-transform-alkali
This babel plugin will transform expressions that use a `react` keyword/call to produce reactive variables. This relies on [alkali](https://github.com/kriszyp/alkali) for variable operations that produces a reactively bound variables.


## Installation

```sh
$ npm install babel-plugin-transform-alkali
```

## Usage

The basic format of using the transform is to write reactive expressions in the form:
```
react(expression)
```
The `react` variable should be imported from alkali. The `expression` will be transformed to code that will reactively respond to any changes in inputs. For example:
```
let a = react(2)
let b = react(4)
let sum = react(a + b)
sum.valueOf() -> 6
a.put(4)
sum.valueOf() -> 8
```

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
