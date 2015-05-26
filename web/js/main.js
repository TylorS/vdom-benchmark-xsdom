'use strict';

var benchmark = require('vdom-benchmark-base');
var snabbdom = require('snabbdom/snabbdom');
var patch = snabbdom.init([]);
var h = require('snabbdom/h');

var NAME = 'snabbdom';
var VERSION = '0.1.0';

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
  this.vnode = null;
}

BenchmarkImpl.prototype.setUp = function() {
};

BenchmarkImpl.prototype.tearDown = function() {
  patch(this.vnode, h('div'));
};

BenchmarkImpl.prototype.render = function() {
  var elm = document.createElement('div');
  this.vnode = patch(elm, h('div', convertToVnodes(this.a)));
  this.container.appendChild(elm);
};

BenchmarkImpl.prototype.update = function() {
  this.vnode = patch(this.vnode, h('div', convertToVnodes(this.b)));
};

document.addEventListener('DOMContentLoaded', function(e) {
  benchmark(NAME, VERSION, BenchmarkImpl);
}, false);
