type ConfigurationKeys =
  | 'type'
  | 'colorSet'
  | 'colorSet_name'
  | 'colorSet_declaration'
  | 'colorSet_constructor_name'
  | 'variable_name'
  | 'variable_colorSet_name'
  | 'constant'
  | 'constant_name'
  | 'constant_value'
  | 'constant_colorSet'
  | 'function'
  | 'function_type'
  | 'function_name'
  | 'function_arguments'
  | 'function_action'
  | 'function_domain'
  | 'function_range';
export type ConfigurationResponse = {
  results: {
    bindings: Array<
      {
        [key in ConfigurationKeys]: {
          type: 'uri' | 'literal';
          value: string;
        };
      }
    >;
  };
};
export interface Func {
  (...args: unknown[]): unknown;
  new (...args: unknown[]): unknown;
}
export type Configuration = {
  colorSets: {
    [key: string]: Func;
  };
  functions: {
    [key: string]: Func;
  };
  variables: {
    [key: string]: Function; // eslint-disable-line @typescript-eslint/ban-types
  };
  constants: {
    [key: string]: unknown;
  };
};

export type TransitionsResponse = {
  results: {
    bindings: Array<{
      transition: {
        type: 'uri';
        value: string;
      };
    }>;
  };
};

type PlacesMarkingsValues =
  | 'type'
  | 'place'
  | 'place_colorSet_name'
  | 'token'
  | 'token_value'
  | 'multiplicity';
export type PlacesMarkingsResponce = {
  results: {
    bindings: Array<
      {
        [key in PlacesMarkingsValues]: {
          type: 'uri';
          value: string;
        };
      }
    >;
  };
};
export type BasisSet = {
  data: unknown;
  multiplicity: number;
};
export type Multiset = {
  cardinality: number;
  basisSets: Record<string, BasisSet>;
};
export type PlacesMarkingsData = {
  [placeId: string]: {
    colorSet: string;
    tokens: {
      [tokenId: string]: {
        value: string;
        multiplicity: number;
      };
    };
  };
};
export type PlacesMarkings = {
  [placeId: string]: {
    colorSet: string;
    multiset: Multiset;
  };
};

type TransitionInputDataValues =
  | 'type'
  | 'code'
  | 'guard_value'
  | 'arc_i'
  | 'place_i'
  | 'arcan_constant_name'
  | 'term_value'
  | 'multiplicity';
export type TransitionInputDataResponse = {
  results: {
    bindings: Array<
      {
        [key in TransitionInputDataValues]: {
          type: 'uri' | 'literal';
          value: string;
        };
      }
    >;
  };
};
export type TransitionInputDataIntermediate = {
  code?: string;
  guard?: string;
  arcs: Record<
    string,
    {
      place: string;
      terms: Array<{
        value: string;
        multiplicity: string;
      }>;
      constant?: string;
    }
  >;
};
export type TransitionInputData = {
  code?: string;
  guard?: string;
  arcs: Record<
    string,
    {
      place: string;
      multiset: Multiset;
    }
  >;
};
