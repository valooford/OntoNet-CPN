// Built-in ColorSet Factories
function Alias(colorSet) {
  return function (...params) {
    return new colorSet(...params);
  };
}
function Product(...colorSets) {
  return function (...data) {
    return data.map((value, i) => new colorSets[i](value));
  };
}
function Record(...namedColorSets) {
  return function (data) {
    return Object.keys(data).reduce((res, id) => {
      res[id] = new namedColorSets[id](data[id]);
      return res;
    }, {});
  };
}
const Union = Alias(Record); // ?
function List(colorSet) {
  return function (...data) {
    return data.map((value) => new colorSet(value));
  };
}

// Built-in ColorSets
const Unit = Alias(Object);
const Boolean = global.Boolean;
const Integer = Alias(Number);
const String = global.String;
function Enumerated(...identifiers) {
  // it's possible to use Object.assign here
  return { ...identifiers };
}
function Indexed(name, from, to) {
  return new Array(from + to).fill(name, from);
}

function Multiset(...basisSets) {
  // this.cardinality = Object.keys(basisSets).length;
  this.cardinality = basisSets.length;
  this.basisSets = basisSets;
}
function BasisSet(data, multiplicity = 1) {
  // this.data = JSON.parse(data);
  this.data = data;
  this.multiplicity = multiplicity;
}

// ColorSets
const Count = Alias(Integer);
const Values = List(String);
const Data = Record({ count: Count, res: String, values: Values });

// Functions
function validate(data) {
  return { ...data, values: data.values.slice(0, 5) }; // last 5 results
}

// Constants
const dataStructure = new Multiset(['{res: res, values: l}']);

module.exports = {
  Alias,
  Product,
  Record,
  Union,
  List,

  Unit,
  Boolean,
  Integer,
  String,
  Enumerated,
  Indexed,

  Multiset,
  BasisSet,

  Count,
  Values,
  Data,

  validate,

  dataStructure,
};
