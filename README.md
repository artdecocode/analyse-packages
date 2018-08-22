# analyse-packages

[![npm version](https://badge.fury.io/js/analyse-packages.svg)](https://npmjs.org/package/analyse-packages)

`analyse-packages` is a new Node.js npm package. Analyse Node.js packages.

```sh
yarn add -E analyse-packages
```

## Table Of Contents

- [Table Of Contents](#table-of-contents)
- [API](#api)
  * [`analysePackages(arg1: string, arg2?: boolean)`](#mynewpackagearg1-stringarg2-boolean-void)

## API

The package is available by importing its default function:

```js
import analysePackages from 'analyse-packages'
```

### `analysePackages(`<br/>&nbsp;&nbsp;`arg1: string,`<br/>&nbsp;&nbsp;`arg2?: boolean,`<br/>`): void`

Call this function to get the result you want.

```js
/* yarn example */
import analysePackages from 'analyse-packages'

(async () => {
  await analysePackages()
})()
```

---

(c) [Art Deco][1] 2018

[1]: https://artdeco.bz
