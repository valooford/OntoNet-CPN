export type StateVariables = 'place_name' | 'token_value' | 'multiplicity';
export type StateResponse = {
  head: {
    vars: StateVariables[];
  };
  results: {
    bindings: Array<
      {
        [key in StateVariables]: {
          type: 'uri' | 'literal';
          value: string;
        };
      }
    >;
  };
};

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
export type Configuration = {
  colorSets: {
    [key: string]: Function; // eslint-disable-line @typescript-eslint/ban-types
  };
  functions: {
    [key: string]: Function; // eslint-disable-line @typescript-eslint/ban-types
  };
  variables: {
    [key: string]: Function; // eslint-disable-line @typescript-eslint/ban-types
  };
  constants: {
    [key: string]: unknown;
  };
};

type TransitionVariables = 'transition' | 'condition_data' | 'variables';
export type TransitionResponse = {
  head: {
    vars: TransitionVariables[];
  };
  results: {
    bindings: Array<
      {
        [key in TransitionVariables]: {
          type: string;
          value: string;
        };
      }
    >;
  };
};

type VarValuesVariables = 'place_i' | 'token_i' | 'values' | string;
export type VarValuesResponse = {
  head: {
    vars: VarValuesVariables[];
  };
  results: {
    bindings: Array<
      {
        [key in VarValuesVariables]: {
          type: string;
          value: string;
        };
      }
    >;
  };
};

export type EnabledTransitionData = {
  id: string; // t1
  variables: string[]; // ["x", "y"]
  groups: {
    // "a, b"
    [values: string]:
      | {
          [place: string]: string[]; // token ids
        }
      | undefined;
  };
};
