type NetElement = {
  [key: string]: string | Record<string, unknown>;
};
export type NetStructure = {
  transitions: Record<
    string,
    {
      guard: string;
      code?: string;
      inputs: Array<{ arc: string; place: string }>;
      outputs: Array<{ arc: string; place: string }>;
    }
  >;
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

export type isolatedBindings = {
  [transitionUri: string]: {
    [arcUri: string]: {
      [annotationChunkBsUri: string]: {
        [tokenBsUri: string]: {
          [variableName: string]: string;
        };
      };
    };
  };
};

export type isolatedBindingsListType = Array<{
  variableName: string;
  value: string;
  tokenUri: string;
  annoChunkUri: string;
}>;
