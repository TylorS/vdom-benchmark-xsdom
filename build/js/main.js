(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Executor = require('./executor');

function Benchmark() {
  this.running = false;
  this.impl = null;
  this.tests = null;
  this.reportCallback = null;
  this.enableTests = false;

  this.container = document.createElement('div');

  this._runButton = document.getElementById('RunButton');
  this._iterationsElement = document.getElementById('Iterations');
  this._reportElement = document.createElement('pre');

  document.body.appendChild(this.container);
  document.body.appendChild(this._reportElement);

  var self = this;

  this._runButton.addEventListener('click', function(e) {
    e.preventDefault();

    if (!self.running) {
      var iterations = parseInt(self._iterationsElement.value);
      if (iterations <= 0) {
        iterations = 10;
      }

      self.run(iterations);
    }
  }, false);

  this.ready(true);
}

Benchmark.prototype.ready = function(v) {
  if (v) {
    this._runButton.disabled = '';
  } else {
    this._runButton.disabled = 'true';
  }
};

Benchmark.prototype.run = function(iterations) {
  var self = this;
  this.running = true;
  this.ready(false);

  new Executor(self.impl, self.container, self.tests, 1, function() { // warmup
    new Executor(self.impl, self.container, self.tests, iterations, function(samples) {
      self._reportElement.textContent = JSON.stringify(samples, null, ' ');
      self.running = false;
      self.ready(true);
      if (self.reportCallback != null) {
        self.reportCallback(samples);
      }
    }, undefined, false).start();
  }, undefined, this.enableTests).start();
};

module.exports = Benchmark;

},{"./executor":2}],2:[function(require,module,exports){
'use strict';

function render(nodes) {
  var children = [];
  var j;
  var c;
  var i;
  var e;
  var n;

  for (i = 0; i < nodes.length; i++) {
    n = nodes[i];
    if (n.children !== null) {
      e = document.createElement('div');
      c = render(n.children);
      for (j = 0; j < c.length; j++) {
        e.appendChild(c[j]);
      }
      children.push(e);
    } else {
      e = document.createElement('span');
      e.textContent = n.key.toString();
      children.push(e);
    }
  }

  return children;
}

function testInnerHtml(testName, nodes, container) {
  var c = document.createElement('div');
  var e = document.createElement('div');
  var children = render(nodes);
  for (var i = 0; i < children.length; i++) {
    e.appendChild(children[i]);
  }
  c.appendChild(e);
  if (c.innerHTML !== container.innerHTML) {
    console.log('error in test: ' + testName);
    console.log('container.innerHTML:');
    console.log(container.innerHTML);
    console.log('should be:');
    console.log(c.innerHTML);
  }
}


function Executor(impl, container, tests, iterations, cb, iterCb, enableTests) {
  if (iterCb === void 0) iterCb = null;

  this.impl = impl;
  this.container = container;
  this.tests = tests;
  this.iterations = iterations;
  this.cb = cb;
  this.iterCb = iterCb;
  this.enableTests = enableTests;

  this._currentTest = 0;
  this._currentIter = 0;
  this._renderSamples = [];
  this._updateSamples = [];
  this._result = [];

  this._tasksCount = tests.length * iterations;

  this._iter = this.iter.bind(this);
}

Executor.prototype.start = function() {
  this._iter();
};

Executor.prototype.finished = function() {
  this.cb(this._result);
};

Executor.prototype.progress = function() {
  if (this._currentTest === 0 && this._currentIter === 0) {
    return 0;
  }

  var tests = this.tests;
  return (this._currentTest * tests.length + this._currentIter) / (tests.length * this.iterataions);
};

Executor.prototype.iter = function() {
  if (this.iterCb != null) {
    this.iterCb(this);
  }

  var tests = this.tests;

  if (this._currentTest < tests.length) {
    var test = tests[this._currentTest];

    if (this._currentIter < this.iterations) {
      var e, t;
      var renderTime, updateTime;

      e = new this.impl(this.container, test.data.a, test.data.b);
      e.setUp();

      t = window.performance.now();
      e.render();
      renderTime = window.performance.now() - t;

      if (this.enableTests) {
        testInnerHtml(test.name + 'render()', test.data.a, this.container);
      }

      t = window.performance.now();
      e.update();
      updateTime = window.performance.now() - t;

      if (this.enableTests) {
        testInnerHtml(test.name + 'update()', test.data.b, this.container);
      }

      e.tearDown();

      this._renderSamples.push(renderTime);
      this._updateSamples.push(updateTime);

      this._currentIter++;
    } else {
      this._result.push({
        name: test.name + ' ' + 'render()',
        data: this._renderSamples.slice(0)
      });

      this._result.push({
        name: test.name + ' ' + 'update()',
        data: this._updateSamples.slice(0)
      });

      this._currentTest++;

      this._currentIter = 0;
      this._renderSamples = [];
      this._updateSamples = [];
    }

    setTimeout(this._iter, 0);
  } else {
    this.finished();
  }
};

module.exports = Executor;

},{}],3:[function(require,module,exports){
'use strict';

var Benchmark = require('./benchmark');
var benchmark = new Benchmark();

function initFromScript(scriptUrl, impl) {
  var e = document.createElement('script');
  e.src = scriptUrl;

  e.onload = function() {
    benchmark.tests = window.generateBenchmarkData().units;
    benchmark.ready(true);
  };

  document.head.appendChild(e);
}

function initFromParentWindow(parent, name, version, id) {
  window.addEventListener('message', function(e) {
    var data = e.data;
    var type = data.type;

    if (type === 'tests') {
      benchmark.tests = data.data;
      benchmark.reportCallback = function(samples) {
        parent.postMessage({
          type: 'report',
          data: {
            name: name,
            version: version,
            samples: samples
          },
          id: id
        }, '*');
      };
      benchmark.ready(true);

      parent.postMessage({
        type: 'ready',
        data: null,
        id: id
      }, '*');
    } else if (type === 'run') {
      benchmark.run(data.data.iterations);
    }
  }, false);

  parent.postMessage({
    type: 'init',
    data: null,
    id: id
  }, '*');
}

function init(name, version, impl) {
  // Parse Query String.
  var qs = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i) {
      var p=a[i].split('=', 2);
      if (p.length == 1) {
        b[p[0]] = "";
      } else {
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
      }
    }
    return b;
  })(window.location.search.substr(1).split('&'));

  if (qs['name'] !== void 0) {
    name = qs['name'];
  }

  if (qs['version'] !== void 0) {
    version = qs['version'];
  }

  var type = qs['type'];

  if (qs['test'] !== void 0) {
    benchmark.enableTests = true;
    console.log('tests enabled');
  }

  var id;
  if (type === 'iframe') {
    id = qs['id'];
    if (id === void 0) id = null;
    initFromParentWindow(window.parent, name, version, id);
  } else if (type === 'window') {
    if (window.opener != null) {
      id = qs['id'];
      if (id === void 0) id = null;
      initFromParentWindow(window.opener, name, version, id);
    } else {
      console.log('Failed to initialize: opener window is NULL');
    }
  } else {
    var testsUrl = qs['data']; // url to the script generating test data
    if (testsUrl !== void 0) {
      initFromScript(testsUrl);
    } else {
      console.log('Failed to initialize: cannot load tests data');
    }
  }

  benchmark.impl = impl;
}

// performance.now() polyfill
// https://gist.github.com/paulirish/5438650
// prepare base perf object
if (typeof window.performance === 'undefined') {
  window.performance = {};
}
if (!window.performance.now){
  var nowOffset = Date.now();
  if (performance.timing && performance.timing.navigationStart) {
    nowOffset = performance.timing.navigationStart;
  }
  window.performance.now = function now(){
    return Date.now() - nowOffset;
  };
}

module.exports = init;

},{"./benchmark":1}],4:[function(require,module,exports){
'use strict';

var benchmark = require('vdom-benchmark-base');
var _xsdom = require('xs-dom');
var elm = document.createElement('div');
var xsdom = _xsdom.init([], elm);
var h = _xsdom.h;

var NAME = 'XSDOM';
var VERSION = '0.0.9';

function convertToVnodes(nodes) {
  var n, i, children = [];
  for (i = 0; i < nodes.length; ++i) {
    n = nodes[i];
    if (n.children !== null) {
      children.push(h('div', {key: n.key}, convertToVnodes(n.children)));
    } else {
      children.push(h('span', {key: n.key}, n.key));
    }
  }
  return children;
}

function BenchmarkImpl(container, a, b) {
  this.container = container;
  this.a = a;
  this.b = b;
}

BenchmarkImpl.prototype.setUp = function() {
};

BenchmarkImpl.prototype.tearDown = function() {
  xsdom.patch(h('div'));
};

BenchmarkImpl.prototype.render = function() {
  xsdom.patch(h('div', {}, convertToVnodes(this.a)));
  this.container.appendChild(elm);
};

BenchmarkImpl.prototype.update = function() {
  xsdom.patch(h('div', {}, convertToVnodes(this.b)));
};

document.addEventListener('DOMContentLoaded', function(e) {
  benchmark(NAME, VERSION, BenchmarkImpl);
}, false);

},{"vdom-benchmark-base":3,"xs-dom":14}],5:[function(require,module,exports){
"use strict";
var index_1 = require('./util/index');
var api = require('./api/dom');
var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];
function registerModules(modules) {
    var callbacks = {
        create: [],
        update: [],
        remove: [],
        destroy: [],
        pre: [],
        post: [],
    };
    index_1.forEach(function (hook) { return index_1.forEach(function (module) {
        if (module[hook])
            callbacks[hook].push(module[hook]);
    }, modules); }, hooks);
    return callbacks;
}
function createRemoveCallback(childElm, listeners) {
    return function () {
        if (--listeners === 0) {
            var parent_1 = api.parentNode(childElm);
            api.removeChild(parent_1, childElm);
        }
    };
}
exports.createRemoveCallback = createRemoveCallback;
var Callbacks = (function () {
    function Callbacks(modules) {
        this.callbacks = registerModules(modules);
    }
    Callbacks.prototype.pre = function () {
        index_1.forEach(function (fn) { return fn(); }, this.callbacks.pre);
    };
    Callbacks.prototype.create = function (vNode) {
        index_1.forEach(function (fn) { return fn(index_1.emptyVNode(), vNode); }, this.callbacks.create);
    };
    Callbacks.prototype.update = function (oldVNode, vNode) {
        index_1.forEach(function (fn) { return fn(oldVNode, vNode); }, this.callbacks.update);
    };
    Callbacks.prototype.insert = function (insertedVNodeQueue) {
        index_1.forEach(function (vNode) { return vNode.data.hook.insert(vNode); }, insertedVNodeQueue);
    };
    Callbacks.prototype.remove = function (vNode, remove) {
        index_1.forEach(function (fn) { return fn(vNode, remove); }, this.callbacks.remove);
    };
    Callbacks.prototype.getListeners = function () {
        return this.callbacks.remove.length + 1;
    };
    Callbacks.prototype.destroy = function (vNode) {
        index_1.forEach(function (fn) { return fn(vNode); }, this.callbacks.destroy);
    };
    Callbacks.prototype.post = function () {
        index_1.forEach(function (fn) { return fn(); }, this.callbacks.post);
    };
    return Callbacks;
}());
exports.Callbacks = Callbacks;

},{"./api/dom":9,"./util/index":15}],6:[function(require,module,exports){
"use strict";
var api = require('./api/dom');
var index_1 = require('./util/index');
var ElementCreator = (function () {
    function ElementCreator(insertedVNodeQueue, callbacks) {
        this.insertedVNodeQueue = insertedVNodeQueue;
        this.callbacks = callbacks;
    }
    ElementCreator.prototype.create = function (vNode) {
        var i;
        var hook;
        if (index_1.isDef(i = vNode.data) && index_1.isDef(hook = i.hook) && index_1.isDef(i = hook.init)) {
            i(vNode);
        }
        if (index_1.isDef(vNode.sel)) {
            var sel = vNode.sel;
            var hashIdx = sel.indexOf('#');
            var dotIdx = sel.indexOf('.', hashIdx);
            var hash = hashIdx > 0 ? hashIdx : sel.length;
            var dot = dotIdx > 0 ? dotIdx : sel.length;
            var tagName = hashIdx !== -1 || dotIdx !== -1
                ? sel.slice(0, Math.min(hash, dot))
                : sel;
            vNode.elm = index_1.isDef(i = vNode.data) && index_1.isDef(i = i.ns)
                ? api.createElementNS(i, tagName)
                : api.createElement(tagName);
            if (hash < dot)
                vNode.elm.id = sel.slice(hash + 1, dot);
            if (dotIdx > 0)
                vNode.elm.className = sel.slice(dot + 1).replace(/\./g, ' ');
            if (Array.isArray(vNode.children)) {
                for (var i_1 = 0; i_1 < vNode.children.length; ++i_1) {
                    api.appendChild(vNode.elm, this.create(vNode.children[i_1]));
                }
            }
            else if (typeof vNode.text === 'string') {
                api.appendChild(vNode.elm, api.createTextNode(vNode.text));
            }
            this.callbacks.create(vNode);
            if (index_1.isDef(hook)) {
                if (index_1.isDef(i = hook.create))
                    i(index_1.emptyVNode(), vNode);
                if (index_1.isDef(hook.insert))
                    this.insertedVNodeQueue.push(vNode);
            }
            return vNode.elm;
        }
        vNode.elm = api.createTextNode(vNode.text);
        return vNode.elm;
    };
    return ElementCreator;
}());
exports.ElementCreator = ElementCreator;

},{"./api/dom":9,"./util/index":15}],7:[function(require,module,exports){
"use strict";
function createVNode(vNode) {
    var data = vNode.data || {};
    var children = vNode.children || void 0;
    var elm = vNode.elm || void 0;
    var text = vNode.text || void 0;
    var key = data === void 0 ? void 0 : data.key;
    return { sel: vNode.sel, data: data, children: children, elm: elm, text: text, key: key };
}
exports.createVNode = createVNode;
function createTextVNode(text) {
    return createVNode({
        sel: void 0,
        data: void 0,
        children: void 0,
        text: text,
    });
}
exports.createTextVNode = createTextVNode;

},{}],8:[function(require,module,exports){
"use strict";
var Callbacks_1 = require('./Callbacks');
var api = require('./api/dom');
var index_1 = require('./util/index');
var pluckPrepatch = index_1.pluck('hook', 'prepatch');
var pluckPostpatch = index_1.pluck('hook', 'postpatch');
var pluckUpdate = index_1.pluck('hook', 'update');
var pluckRemove = index_1.pluck('hook', 'remove');
var pluckDestroy = index_1.pluck('hook', 'destroy');
var VNodePatcher = (function () {
    function VNodePatcher(elementCreator, callbacks) {
        this.elementCreator = elementCreator;
        this.callbacks = callbacks;
    }
    VNodePatcher.prototype.patch = function (oldVNode, vNode) {
        var prepatch = pluckPrepatch(vNode.data);
        if (index_1.isDef(prepatch)) {
            prepatch(oldVNode, vNode);
        }
        var elm = vNode.elm = oldVNode.elm;
        var oldChildren = oldVNode.children;
        var children = vNode.children;
        if (oldVNode === vNode)
            return; // used for thunks only
        if (!index_1.sameVNode(oldVNode, vNode)) {
            var parentElm = api.parentNode(oldVNode.elm);
            elm = this.elementCreator.create(vNode);
            api.insertBefore(parentElm, elm, oldVNode.elm);
            this.remove(parentElm, [oldVNode], 0, 0);
            return;
        }
        this.callbacks.update(oldVNode, vNode);
        var update = pluckUpdate(vNode.data);
        if (update) {
            update(oldVNode, vNode);
        }
        if (index_1.isUndef(vNode.text)) {
            if (index_1.isDef(oldVNode.text)) {
                api.setTextContent(elm, '');
            }
            if (index_1.isDef(oldChildren) && index_1.isDef(children) && oldChildren !== children) {
                this.update(elm, oldChildren, children);
            }
            else if (index_1.isDef(children)) {
                this.add(elm, null, children, 0, children.length - 1);
            }
            else if (index_1.isDef(oldChildren)) {
                this.remove(elm, oldChildren, 0, oldChildren.length - 1);
            }
        }
        else if (index_1.isDef(vNode.text) && oldVNode.text !== vNode.text) {
            api.setTextContent(elm, vNode.text);
        }
        var postpatch = pluckPostpatch(vNode.data);
        if (postpatch) {
            postpatch(oldVNode, vNode);
        }
        return vNode;
    };
    VNodePatcher.prototype.update = function (element, oldChildren, children) {
        // controls while loop
        var oldStartIdx = 0;
        var newStartIdx = 0;
        var oldEndIdx = oldChildren.length - 1;
        var newEndIdx = children.length - 1;
        // used to compare children to see if they have been simply moved
        // or if they have been removed altogether
        var oldStartVNode = oldChildren[0];
        var oldEndVNode = oldChildren[oldEndIdx];
        var newStartVNode = children[0];
        var newEndVNode = children[newEndIdx];
        // used to keep track of `key`ed items that need to be reordered
        var oldKeyToIdx; // a map of vNode keys -> index in oldChildren array
        var idxInOld; // index of a *new* vNode in the oldChildren array
        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (index_1.isUndef(oldStartVNode)) {
                oldStartVNode = oldChildren[++oldStartIdx];
            }
            else if (index_1.isUndef(oldEndVNode)) {
                oldEndVNode = oldChildren[--oldEndIdx];
            }
            else if (index_1.sameVNode(oldStartVNode, newStartVNode)) {
                this.patch(oldStartVNode, newStartVNode);
                oldStartVNode = oldChildren[++oldStartIdx];
                newStartVNode = children[++newStartIdx];
            }
            else if (index_1.sameVNode(oldEndVNode, newEndVNode)) {
                this.patch(oldEndVNode, newEndVNode);
                oldEndVNode = oldChildren[--oldEndIdx];
                newEndVNode = children[--newEndIdx];
            }
            else if (index_1.sameVNode(oldStartVNode, newEndVNode)) {
                this.patch(oldStartVNode, newEndVNode);
                api.insertBefore(element, oldStartVNode.elm, api.nextSibling(oldEndVNode.elm));
                oldStartVNode = oldChildren[++oldStartIdx];
                newEndVNode = children[--newEndIdx];
            }
            else if (index_1.sameVNode(oldEndVNode, newStartVNode)) {
                this.patch(oldEndVNode, newStartVNode);
                api.insertBefore(element, oldEndVNode.elm, oldStartVNode.elm);
                oldEndVNode = oldChildren[--oldEndIdx];
                newStartVNode = children[++newStartIdx];
            }
            else {
                if (index_1.isUndef(oldKeyToIdx)) {
                    // a map of keys -> index of oldChidren array
                    oldKeyToIdx = index_1.createKeyToOldIdx(oldChildren, oldStartIdx, oldEndIdx);
                }
                idxInOld = oldKeyToIdx[newStartVNode.key]; // try to find where the current vNode was previously
                if (index_1.isUndef(idxInOld)) {
                    var elm = this.elementCreator.create(newStartVNode);
                    api.insertBefore(element, elm, oldStartVNode.elm);
                    newStartVNode = children[++newStartIdx];
                }
                else {
                    var elmToMove = oldChildren[idxInOld];
                    this.patch(elmToMove, newStartVNode);
                    oldChildren[idxInOld] = void 0;
                    api.insertBefore(element, elmToMove.elm, oldStartVNode.elm);
                    newStartVNode = children[++newStartIdx];
                }
            }
        }
        if (oldStartIdx > oldEndIdx) {
            var before_1 = index_1.isUndef(children[newEndIdx + 1]) ? null
                : children[newEndIdx + 1].elm;
            this.add(element, before_1, children, newStartIdx, newEndIdx);
        }
        else if (newStartIdx > newEndIdx) {
            this.remove(element, oldChildren, oldStartIdx, oldEndIdx);
        }
    };
    VNodePatcher.prototype.add = function (parentElm, before, vNodes, startIdx, endIdx) {
        if (endIdx === void 0) { endIdx = 0; }
        for (; startIdx <= endIdx; ++startIdx) {
            api.insertBefore(parentElm, this.elementCreator.create(vNodes[startIdx]), before);
        }
    };
    VNodePatcher.prototype.remove = function (parentElm, vNodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
            var currentVNode = vNodes[startIdx];
            if (index_1.isDef(currentVNode)) {
                if (index_1.isDef(currentVNode.sel)) {
                    this.invokeDestroyHook(currentVNode);
                    var listeners = this.callbacks.getListeners();
                    var removeCallback = Callbacks_1.createRemoveCallback(currentVNode.elm, listeners);
                    this.callbacks.remove(currentVNode, removeCallback);
                    var remove = pluckRemove(currentVNode.data);
                    if (remove) {
                        remove(currentVNode, removeCallback);
                    }
                    else {
                        removeCallback();
                    }
                }
                else {
                    api.removeChild(parentElm, currentVNode.elm);
                }
            }
        }
    };
    VNodePatcher.prototype.invokeDestroyHook = function (vNode) {
        if (vNode.sel === void 0) {
            return;
        }
        var destroy = pluckDestroy(vNode.data);
        if (destroy) {
            destroy(vNode);
        }
        this.callbacks.destroy(vNode);
        if (index_1.isDef(vNode.children)) {
            var children = vNode.children;
            for (var i = 0; i < children.length; ++i) {
                this.invokeDestroyHook(children[i]);
            }
        }
    };
    return VNodePatcher;
}());
exports.VNodePatcher = VNodePatcher;

},{"./Callbacks":5,"./api/dom":9,"./util/index":15}],9:[function(require,module,exports){
"use strict";
function createElement(tagName) {
    return document.createElement(tagName);
}
exports.createElement = createElement;
function createElementNS(namespaceURI, qualifiedName) {
    return document.createElementNS(namespaceURI, qualifiedName);
}
exports.createElementNS = createElementNS;
function createTextNode(text) {
    return document.createTextNode(text);
}
exports.createTextNode = createTextNode;
function insertBefore(parentNode, newNode, referenceNode) {
    parentNode.insertBefore(newNode, referenceNode);
}
exports.insertBefore = insertBefore;
function removeChild(node, child) {
    if (node === void 0) {
        return;
    }
    node.removeChild(child);
}
exports.removeChild = removeChild;
function appendChild(node, child) {
    node.appendChild(child);
}
exports.appendChild = appendChild;
function parentNode(node) {
    return node.parentElement;
}
exports.parentNode = parentNode;
function nextSibling(node) {
    return node.nextSibling;
}
exports.nextSibling = nextSibling;
function tagName(node) {
    return node.tagName;
}
exports.tagName = tagName;
function setTextContent(node, text) {
    node.textContent = text;
}
exports.setTextContent = setTextContent;

},{}],10:[function(require,module,exports){
"use strict";
var hyperscript_1 = require('./hyperscript');
function isValidString(param) {
    return typeof param === 'string' && param.length > 0;
}
function isSelector(param) {
    return isValidString(param) && (param[0] === '.' || param[0] === '#');
}
function createTagFunction(tagName) {
    return function hyperscript(first, b, c) {
        if (isSelector(first)) {
            if (!!b && !!c) {
                return hyperscript_1.h(tagName + first, b, c);
            }
            else if (!!b) {
                return hyperscript_1.h(tagName + first, b);
            }
            else {
                return hyperscript_1.h(tagName + first, {});
            }
        }
        else if (!!b) {
            return hyperscript_1.h(tagName, first, b);
        }
        else if (!!first) {
            return hyperscript_1.h(tagName, first);
        }
        else {
            return hyperscript_1.h(tagName, {});
        }
    };
}
exports.createTagFunction = createTagFunction;
var TAG_NAMES = [
    'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base',
    'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
    'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'dfn', 'dir', 'div', 'dl',
    'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
    'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'keygen', 'label', 'legend',
    'li', 'link', 'main', 'map', 'mark', 'menu', 'meta', 'nav', 'noscript',
    'object', 'ol', 'optgroup', 'option', 'p', 'param', 'pre', 'q', 'rp', 'rt',
    'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span',
    'strong', 'style', 'sub', 'sup', 'table', 'tbody', 'td', 'textarea',
    'tfoot', 'th', 'thead', 'title', 'tr', 'u', 'ul', 'video', 'progress'
];
var exported = { TAG_NAMES: TAG_NAMES, isSelector: isSelector, createTagFunction: createTagFunction };
TAG_NAMES.forEach(function (n) {
    exported[n] = createTagFunction(n);
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exported;

},{"./hyperscript":11}],11:[function(require,module,exports){
"use strict";
var VNode_1 = require('../VNode');
function isObservable(x) {
    return !Array.isArray(x) && typeof x.map === 'function';
}
function addNSToObservable(vNode) {
    addNS(vNode.data, vNode.children);
    return vNode;
}
function addNS(data, children) {
    data.ns = "http://www.w3.org/2000/svg";
    if (children !== void 0 && Array.isArray(children)) {
        for (var i = 0; i < children.length; ++i) {
            if (isObservable(children[i])) {
                children[i] = children[i].map(addNSToObservable);
            }
            else {
                addNS(children[i].data, children[i].children);
            }
        }
    }
}
function h(sel, b, c) {
    var data = {};
    var children;
    var text;
    var i;
    if (arguments.length === 3) {
        data = b;
        if (Array.isArray(c)) {
            children = c;
        }
        else if (typeof c === 'string') {
            text = c;
        }
    }
    else if (arguments.length === 2) {
        if (Array.isArray(b)) {
            children = b;
        }
        else if (typeof b === 'string') {
            text = b;
        }
        else {
            data = b;
        }
    }
    if (Array.isArray(children)) {
        for (i = 0; i < children.length; ++i) {
            if (typeof children[i] === 'string') {
                children[i] = VNode_1.createTextVNode(children[i]);
            }
        }
    }
    if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
        addNS(data, children);
    }
    return VNode_1.createVNode({ sel: sel, data: data, children: children, text: text });
}
exports.h = h;
;

},{"../VNode":7}],12:[function(require,module,exports){
"use strict";
var hyperscript_helpers_1 = require('./hyperscript-helpers');
var TAG_NAMES = [
    'a', 'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
    'animateMotion', 'animateTransform', 'animateTransform', 'circle', 'clipPath',
    'color-profile', 'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
    'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
    'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
    'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
    'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotlight',
    'feTile', 'feTurbulence', 'filter', 'font', 'font-face', 'font-face-format',
    'font-face-name', 'font-face-src', 'font-face-uri', 'foreignObject', 'g',
    'glyph', 'glyphRef', 'hkern', 'image', 'line', 'linearGradient', 'marker',
    'mask', 'metadata', 'missing-glyph', 'mpath', 'path', 'pattern', 'polygon',
    'polyling', 'radialGradient', 'rect', 'script', 'set', 'stop', 'style',
    'switch', 'symbol', 'text', 'textPath', 'title', 'tref', 'tspan', 'use',
    'view', 'vkern'
];
var svg = hyperscript_helpers_1.createTagFunction('svg');
TAG_NAMES.forEach(function (tag) {
    svg[tag] = hyperscript_helpers_1.createTagFunction(tag);
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = svg;

},{"./hyperscript-helpers":10}],13:[function(require,module,exports){
"use strict";
var hyperscript_1 = require('./hyperscript');
function copyToThunk(vnode, thunk) {
    thunk.elm = vnode.elm;
    vnode.data.fn = thunk.data.fn;
    vnode.data.args = thunk.data.args;
    thunk.data = vnode.data;
    thunk.children = vnode.children;
    thunk.text = vnode.text;
    thunk.elm = vnode.elm;
}
function init(thunk) {
    var cur = thunk.data;
    var vNode = cur.fn.apply(undefined, cur.args);
    copyToThunk(vNode, thunk);
}
function prepatch(oldVnode, thunk) {
    var old = oldVnode.data;
    var cur = thunk.data;
    var oldArgs = old.args;
    var args = cur.args;
    if (old.fn !== cur.fn || oldArgs.length !== args.length) {
        copyToThunk(cur.fn.apply(undefined, args), thunk);
    }
    for (var i = 0; i < args.length; ++i) {
        if (oldArgs[i] !== args[i]) {
            copyToThunk(cur.fn.apply(undefined, args), thunk);
            return;
        }
    }
    copyToThunk(oldVnode, thunk);
}
function thunk(sel, key, fn) {
    var args = [];
    for (var _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
    }
    return hyperscript_1.h(sel, {
        key: key,
        hook: { init: init, prepatch: prepatch },
        fn: fn,
        args: args
    });
}
exports.thunk = thunk;
;

},{"./hyperscript":11}],14:[function(require,module,exports){
"use strict";
// TS Defs;
var thunk_1 = require('./hyperscript/thunk');
exports.thunk = thunk_1.thunk;
var hyperscript_1 = require('./hyperscript/hyperscript');
exports.h = hyperscript_1.h;
var hyperscript_helpers_1 = require('./hyperscript/hyperscript-helpers');
var a = hyperscript_helpers_1.default.a, abbr = hyperscript_helpers_1.default.abbr, address = hyperscript_helpers_1.default.address, area = hyperscript_helpers_1.default.area, article = hyperscript_helpers_1.default.article, aside = hyperscript_helpers_1.default.aside, audio = hyperscript_helpers_1.default.audio, b = hyperscript_helpers_1.default.b, base = hyperscript_helpers_1.default.base, bdi = hyperscript_helpers_1.default.bdi, bdo = hyperscript_helpers_1.default.bdo, blockquote = hyperscript_helpers_1.default.blockquote, body = hyperscript_helpers_1.default.body, br = hyperscript_helpers_1.default.br, button = hyperscript_helpers_1.default.button, canvas = hyperscript_helpers_1.default.canvas, caption = hyperscript_helpers_1.default.caption, cite = hyperscript_helpers_1.default.cite, code = hyperscript_helpers_1.default.code, col = hyperscript_helpers_1.default.col, colgroup = hyperscript_helpers_1.default.colgroup, dd = hyperscript_helpers_1.default.dd, del = hyperscript_helpers_1.default.del, dfn = hyperscript_helpers_1.default.dfn, dir = hyperscript_helpers_1.default.dir, div = hyperscript_helpers_1.default.div, dl = hyperscript_helpers_1.default.dl, dt = hyperscript_helpers_1.default.dt, em = hyperscript_helpers_1.default.em, embed = hyperscript_helpers_1.default.embed, fieldset = hyperscript_helpers_1.default.fieldset, figcaption = hyperscript_helpers_1.default.figcaption, figure = hyperscript_helpers_1.default.figure, footer = hyperscript_helpers_1.default.footer, form = hyperscript_helpers_1.default.form, h1 = hyperscript_helpers_1.default.h1, h2 = hyperscript_helpers_1.default.h2, h3 = hyperscript_helpers_1.default.h3, h4 = hyperscript_helpers_1.default.h4, h5 = hyperscript_helpers_1.default.h5, h6 = hyperscript_helpers_1.default.h6, head = hyperscript_helpers_1.default.head, header = hyperscript_helpers_1.default.header, hgroup = hyperscript_helpers_1.default.hgroup, hr = hyperscript_helpers_1.default.hr, html = hyperscript_helpers_1.default.html, i = hyperscript_helpers_1.default.i, iframe = hyperscript_helpers_1.default.iframe, img = hyperscript_helpers_1.default.img, input = hyperscript_helpers_1.default.input, ins = hyperscript_helpers_1.default.ins, kbd = hyperscript_helpers_1.default.kbd, keygen = hyperscript_helpers_1.default.keygen, label = hyperscript_helpers_1.default.label, legend = hyperscript_helpers_1.default.legend, li = hyperscript_helpers_1.default.li, link = hyperscript_helpers_1.default.link, main = hyperscript_helpers_1.default.main, map = hyperscript_helpers_1.default.map, mark = hyperscript_helpers_1.default.mark, menu = hyperscript_helpers_1.default.menu, meta = hyperscript_helpers_1.default.meta, nav = hyperscript_helpers_1.default.nav, noscript = hyperscript_helpers_1.default.noscript, object = hyperscript_helpers_1.default.object, ol = hyperscript_helpers_1.default.ol, optgroup = hyperscript_helpers_1.default.optgroup, option = hyperscript_helpers_1.default.option, p = hyperscript_helpers_1.default.p, param = hyperscript_helpers_1.default.param, pre = hyperscript_helpers_1.default.pre, q = hyperscript_helpers_1.default.q, rp = hyperscript_helpers_1.default.rp, rt = hyperscript_helpers_1.default.rt, ruby = hyperscript_helpers_1.default.ruby, s = hyperscript_helpers_1.default.s, samp = hyperscript_helpers_1.default.samp, script = hyperscript_helpers_1.default.script, section = hyperscript_helpers_1.default.section, select = hyperscript_helpers_1.default.select, small = hyperscript_helpers_1.default.small, source = hyperscript_helpers_1.default.source, span = hyperscript_helpers_1.default.span, strong = hyperscript_helpers_1.default.strong, style = hyperscript_helpers_1.default.style, sub = hyperscript_helpers_1.default.sub, sup = hyperscript_helpers_1.default.sup, table = hyperscript_helpers_1.default.table, tbody = hyperscript_helpers_1.default.tbody, td = hyperscript_helpers_1.default.td, textarea = hyperscript_helpers_1.default.textarea, tfoot = hyperscript_helpers_1.default.tfoot, th = hyperscript_helpers_1.default.th, thead = hyperscript_helpers_1.default.thead, title = hyperscript_helpers_1.default.title, tr = hyperscript_helpers_1.default.tr, u = hyperscript_helpers_1.default.u, ul = hyperscript_helpers_1.default.ul, video = hyperscript_helpers_1.default.video;
exports.a = a;
exports.abbr = abbr;
exports.address = address;
exports.area = area;
exports.article = article;
exports.aside = aside;
exports.audio = audio;
exports.b = b;
exports.base = base;
exports.bdi = bdi;
exports.bdo = bdo;
exports.blockquote = blockquote;
exports.body = body;
exports.br = br;
exports.button = button;
exports.canvas = canvas;
exports.caption = caption;
exports.cite = cite;
exports.code = code;
exports.col = col;
exports.colgroup = colgroup;
exports.dd = dd;
exports.del = del;
exports.dfn = dfn;
exports.dir = dir;
exports.div = div;
exports.dl = dl;
exports.dt = dt;
exports.em = em;
exports.embed = embed;
exports.fieldset = fieldset;
exports.figcaption = figcaption;
exports.figure = figure;
exports.footer = footer;
exports.form = form;
exports.h1 = h1;
exports.h2 = h2;
exports.h3 = h3;
exports.h4 = h4;
exports.h5 = h5;
exports.h6 = h6;
exports.head = head;
exports.header = header;
exports.hgroup = hgroup;
exports.hr = hr;
exports.html = html;
exports.i = i;
exports.iframe = iframe;
exports.img = img;
exports.input = input;
exports.ins = ins;
exports.kbd = kbd;
exports.keygen = keygen;
exports.label = label;
exports.legend = legend;
exports.li = li;
exports.link = link;
exports.main = main;
exports.map = map;
exports.mark = mark;
exports.menu = menu;
exports.meta = meta;
exports.nav = nav;
exports.noscript = noscript;
exports.object = object;
exports.ol = ol;
exports.optgroup = optgroup;
exports.option = option;
exports.p = p;
exports.param = param;
exports.pre = pre;
exports.q = q;
exports.rp = rp;
exports.rt = rt;
exports.ruby = ruby;
exports.s = s;
exports.samp = samp;
exports.script = script;
exports.section = section;
exports.select = select;
exports.small = small;
exports.source = source;
exports.span = span;
exports.strong = strong;
exports.style = style;
exports.sub = sub;
exports.sup = sup;
exports.table = table;
exports.tbody = tbody;
exports.td = td;
exports.textarea = textarea;
exports.tfoot = tfoot;
exports.th = th;
exports.thead = thead;
exports.title = title;
exports.tr = tr;
exports.u = u;
exports.ul = ul;
exports.video = video;
var svg_helpers_1 = require('./hyperscript/svg-helpers');
exports.svg = svg_helpers_1.default;
var xs_dom_1 = require('./xs-dom');
exports.init = xs_dom_1.init;

},{"./hyperscript/hyperscript":11,"./hyperscript/hyperscript-helpers":10,"./hyperscript/svg-helpers":12,"./hyperscript/thunk":13,"./xs-dom":16}],15:[function(require,module,exports){
"use strict";
function isDef(x) {
    return typeof x !== 'undefined';
}
exports.isDef = isDef;
function isUndef(x) {
    return typeof x === 'undefined';
}
exports.isUndef = isUndef;
function emptyVNode() {
    return { sel: '', data: {}, children: [], key: void 0, text: void 0 };
}
exports.emptyVNode = emptyVNode;
function sameVNode(vNode1, vNode2) {
    return vNode1.key === vNode2.key && vNode1.sel === vNode2.sel;
}
exports.sameVNode = sameVNode;
function createKeyToOldIdx(children, beginIdx, endIdx) {
    var map = {};
    var key;
    for (var i = beginIdx; i <= endIdx; ++i) {
        key = children[i].key;
        if (isDef(key))
            map[key] = i;
    }
    return map;
}
exports.createKeyToOldIdx = createKeyToOldIdx;
function pluck() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    var a;
    return function plucker(obj) {
        switch (args.length) {
            case 0: return obj;
            case 1: return obj[args[0]] || void 0;
            case 2:
                a = obj[args[0]];
                return isDef(a) ? a[args[1]] : void 0;
            default: throw Error('Too many arguments');
        }
    };
}
exports.pluck = pluck;
function forEach(fn, array) {
    var l = array.length;
    for (var i = 0; i < l; ++i) {
        fn(array[i]);
    }
}
exports.forEach = forEach;
function curry2(f) {
    function curried(a, b) {
        switch (arguments.length) {
            case 0: return curried;
            case 1: return function (b) { return f(a, b); };
            default: return f(a, b);
        }
    }
    return curried;
}
exports.curry2 = curry2;

},{}],16:[function(require,module,exports){
"use strict";
var api = require('./api/dom');
var index_1 = require('./util/index');
var Callbacks_1 = require('./Callbacks');
var ElementCreator_1 = require('./ElementCreator');
var VNodePatcher_1 = require('./VNodePatcher');
var index_2 = require('./util/index');
var VNode_1 = require('./VNode');
function emptyVNodeAt(elm) {
    return VNode_1.createVNode({
        sel: api.tagName(elm).toLowerCase(),
        elm: elm,
    });
}
exports.init = index_2.curry2(function init(modules, rootElement) {
    var insertedVNodeQueue = [];
    var callbacks = new Callbacks_1.Callbacks(modules);
    var elementCreator = new ElementCreator_1.ElementCreator(insertedVNodeQueue, callbacks);
    var vNodePatcher = new VNodePatcher_1.VNodePatcher(elementCreator, callbacks);
    var vNode = emptyVNodeAt(rootElement);
    return new XSDOM(insertedVNodeQueue, callbacks, elementCreator, vNodePatcher, vNode);
});
var XSDOM = (function () {
    function XSDOM(insertedVNodeQueue, callbacks, elementCreator, vNodePatcher, oldVNode) {
        this.insertedVNodeQueue = insertedVNodeQueue;
        this.callbacks = callbacks;
        this.elementCreator = elementCreator;
        this.vNodePatcher = vNodePatcher;
        this.oldVNode = oldVNode;
    }
    XSDOM.prototype.patch = function (vNode) {
        var oldVNode = this.oldVNode;
        this.callbacks.pre();
        if (index_1.sameVNode(oldVNode, vNode)) {
            vNode = this.vNodePatcher.patch(oldVNode, vNode);
        }
        else {
            var parent_1 = api.parentNode(oldVNode.elm);
            var element = this.elementCreator.create(vNode);
            vNode.elm = element;
            if (parent_1 !== null) {
                api.insertBefore(parent_1, element, api.nextSibling(oldVNode.elm));
                this.vNodePatcher.remove(parent_1, [oldVNode], 0, 0);
            }
        }
        this.callbacks.insert(this.insertedVNodeQueue);
        this.callbacks.post();
        this.insertedVNodeQueue = [];
        this.oldVNode = vNode;
        return vNode;
    };
    return XSDOM;
}());

},{"./Callbacks":5,"./ElementCreator":6,"./VNode":7,"./VNodePatcher":8,"./api/dom":9,"./util/index":15}]},{},[4])


//# sourceMappingURL=main.js.map
