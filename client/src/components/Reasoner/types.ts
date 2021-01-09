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

type TransitionInputDataValues =
  | 'transition_name'
  | 'code'
  | 'guard_value'
  | 'arc_i'
  | 'arcan_constant_name'
  | 'term_value'
  | 'a_multiplicity'
  | 'place_i'
  | 'token_value'
  | 'p_multiplicity';
export type TransitionInputDataResponse = {
  results: {
    bindings: Array<
      {
        [key in TransitionInputDataValues]: {
          type: string;
          value: string;
        };
      }
    >;
  };
};
