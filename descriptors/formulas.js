// Built-in ColorSet Factories
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
const Union = Record;
function List(colorSet) {
  return function (...data) {
    return data.map((value) => new colorSet(value));
  };
}
function Alias(colorSet) {
  return function (...params) {
    return colorSet(...params);
  };
}

// Built-in ColorSets
const Unit = Alias(Object);
const Boolean = Alias(Boolean);
const Integer = Alias(Number);
const String = Alias(String);
function Enumerated(...indices) {
  return { ...indices };
}
function Indexed(name, from, to) {
  return new Array(from + to).fill(name, from);
}

// ColorSets
const Count = Integer;
const Values = List(String);
const Data = Record({ count: Count, res: String, values: Values });

// Functions
function validate(data) {
  return { ...data, values: data.values.slice(0, 5) }; // last 5 results
}

// Constants
const dataStructure = new Multiset(['{res: res, values: l}']);

module.exports = {
  Unit,
  Boolean,
  Integer,
  String,
  Enumerated,
  Indexed,
};
