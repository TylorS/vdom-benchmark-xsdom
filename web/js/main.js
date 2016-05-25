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
