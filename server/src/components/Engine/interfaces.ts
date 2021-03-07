type NetElement = {
  id: string;
  [key: string]: string;
};
export type NetStructure = {
  transitions: Record<string, NetElement>;
  arcs: Record<string, NetElement>;
  places: Record<string, NetElement>;
};

export type selectionResponse = {
  head: {
    vars: string[];
  };
  results: {
    bindings: Array<{
      [key: string]: {
        type: 'uri' | 'literal';
        value: string;
      };
    }>;
  };
};

type initialStateFields = 'type' | 'id' | 'string';
export type initialStateResponse = {
  head: {
    vars: initialStateFields[];
  };
  results: {
    bindings: Array<
      {
        [key in initialStateFields]: {
          type: 'uri' | 'literal';
          value: string;
        };
      }
    >;
  };
};
