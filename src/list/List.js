'use strict';

const Lazy = require('lazy.js');
const Node = require('./Node');

class List {
  constructor(id, seq, ver, items) {
    this.id = id;
    this.seq = seq || 0;
    this.ver = ver || 0;
    this._items = items || [];
    this._currentBatch = [];
  }

  /* Methods */
  add(data) {
    const heads = List.findHeads(this.items);
    const node  = new Node(this.id, this.seq, this.ver, data, heads);
    this._currentBatch.push(node);
    this.ver ++;
  }

  join(other) {
    this.seq = (other.seq && other.seq > this.seq ? other.seq : this.seq) + 1;
    this.ver = 0;
    const current = Lazy(this._currentBatch).difference(this._items);
    const others  = Lazy(other.items).difference(this._items);
    const final   = current.union(others);
    this._items   = Lazy(this._items).concat(final).toArray();
    this._currentBatch = [];
  }

  clear() {
    this._items = [];
    this._currentBatch = [];
    this.seq = 0;
    this.ver = 0;
  }

  /* Private methods */
  _commit() {
    const current = Lazy(this._currentBatch).difference(this._items).toArray();
    this._items   = this._items.concat(current);
    this._currentBatch = [];
    this.ver = 0;
    this.seq ++;
  }

  /* Properties */
  get items() {
    return this._items.concat(this._currentBatch);
  }

  get compactId() {
    return "" + this.id + "." + this.seq + "." + this.ver;
  }

  get asJson() {
    return {
      id: this.id,
      seq: this.seq,
      ver: this.ver,
      items: this._currentBatch.map((f) => f.asJson)
    };
  }

  /* Static methods */
  static fromJson(json) {
    let list = new List(json.id);
    list.seq = json.seq;
    list.ver = json.ver;
    list._items = Lazy(json.items)
      .map((f) => new Node(f.id, f.seq, f.ver, f.data, f.next))
      .unique()
      .toArray();
    return list;
  }

  static findHeads(list) {
    return Lazy(list)
      .reverse()
      .indexBy((f) => f.id)
      .pairs()
      .map((f) => f[1])
      .filter((f) => !List.isReferencedInChain(list, f))
      .toArray();
  }

  static isReferencedInChain(all, item) {
    return Lazy(all).find((e) => e.hasChild(item)) !== undefined;
  }
}

module.exports = List;