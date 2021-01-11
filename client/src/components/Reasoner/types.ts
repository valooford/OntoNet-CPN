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
export type PlacesMarkingsData = {
  [placeId: string]: {
    colorSet: string;
    tokens: Array<{ value: string; multiplicity: number }>;
  };
};

type TransitionInputDataValues =
  | 'type'
  | 'code'
  | 'guard_value'
  | 'arc_i'
  | 'arcan_constant_name'
  | 'term_value'
  | 'multiplicity'
  | 'place_i';
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
export type TransitionInputData = {
  code?: string;
  guard?: string;
  arcs: Record<
    string,
    {
      place: string;
      constant?: string;
      term?: string;
      multiplicity?: string;
    }
  >;
};
