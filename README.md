# vdom-benchmark-snabbdom

[Virtual DOM Benchmark](https://github.com/localvoid/vdom-benchmark)
implementation for [Snabbdom](https://github.com/paldepind/snabbdom) library.

## Development

### Install dependencies

```sh
$ npm install
```

### Development server

```sh
$ gulp serve
```

By default when you access `index.html` page it will wait for
benchmark test cases from the parent window. To use custom test cases,
use `data` attribute in query string, for example:
`http://localhost:3000/?data=http://localvoid.github.io/vdom-benchmark/generator.js`
will use test cases from the vdom benchmark.

### Release build

```sh
$ NODE_ENV=production gulp
```

### Deploy to github pages

```sh
$ NODE_ENV=production gulp deploy
```
