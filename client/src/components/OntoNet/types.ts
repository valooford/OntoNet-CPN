export type StateVariables = "place" | "token" | "token_data";
export type StateResponse = {
  head: {
    vars: StateVariables[];
  };
  results: {
    bindings: Array<
      {
        [key in StateVariables]: {
          type: string;
          value: string;
        };
      }
    >;
  };
};

type TransitionVariables = "transition" | "condition_data" | "variables";
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

type VarValuesVariables = "place_i" | "token_i" | "values" | string;
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
  groups: {
    // "a, b"
    [values: string]:
      | {
          [place: string]: string[]; // token ids
        }
      | undefined;
  };
};
