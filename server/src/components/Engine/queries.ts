export default {
  'reasoning-select': (): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    SELECT ?type ?id
    #store
    ?guard ?code ?arc ?arc_type ?place
    #calc (places & arcs)
    ?term ?term_value
    ?value
    #FROM <urn:x-arq:DefaultGraph>
    FROM <http://localhost:3030/ontonet/data/tbox>
    FROM <http://localhost:3030/ontonet/data/abox>
    WHERE {
      ?cpn rdf:type t:CPN.
      {
        ?cpn t:has_node ?transition.
        ?transition rdf:type t:Transition.
        BIND (?transition as ?id)
        BIND ("transitions" as ?type)
        {
          ?transition t:has_guard ?guard_term.
          ?guard_term t:has_value ?guard.
          OPTIONAL {
            ?transition t:has_code ?code_term.
            ?code_term t:has_value ?code.
          }
        }
        UNION
        {
          ?arc rdf:type t:Arc.
          {
            ?arc t:has_sourceNode ?place;
                 t:has_targetNode ?transition.
            BIND("input" as ?arc_type)
          }
          UNION
          {
            ?arc t:has_sourceNode ?transition;
                 t:has_targetNode ?place.
            BIND("output" as ?arc_type)
          }
        }
      }
      UNION
      {
        {
          ?arc_or_place rdf:type t:Arc;
                        t:has_annotation ?_term.
          BIND ("arcs" as ?type)
        }
        UNION
        {
          ?arc_or_place rdf:type t:Place;
                        t:has_initialTokens ?_term.
          BIND ("places" as ?type)
        }
        BIND (?arc_or_place as ?id)
        OPTIONAL {
          ?eval rdf:type t:Evaluation;
                t:has_term ?_term;
                t:has_data ?data.
          ?data t:has_value ?value.
        }
        OPTIONAL {
          FILTER(!BOUND(?value))
          BIND(?_term as ?term)
          ?_term t:has_value ?term_value.
        }
      }
    }
    ORDER BY ?type ?arc`;
  },
  'get-arcs-annotations': (): string => {
    return `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>

    SELECT ?id ?basis_set ?value ?multiplicity
    FROM <http://localhost:3030/ontonet/data/tbox>
    FROM <http://localhost:3030/ontonet/data/abox>
    WHERE {
      ?cpn rdf:type t:CPN;
          t:has_arc ?arc.
      ?arc rdf:type t:Arc;
          t:has_multisetOfTerms ?multiset.
      ?multiset t:has_basisSet ?basis_set.
      ?basis_set t:has_data ?data;
                  t:has_multiplicity ?multiplicity.
      ?data t:has_value ?value.
      BIND(?arc as ?id)
    }
    `;
  },
  'get-marking': (): string => {
    return `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>

    SELECT DISTINCT ?id ?basis_set ?value ?multiplicity
    FROM <http://localhost:3030/ontonet/data/tbox>
    FROM <http://localhost:3030/ontonet/data/abox>
    WHERE {
      ?cpn rdf:type t:CPN;
          t:has_marking ?marking.
      
      #last marking
      FILTER NOT EXISTS {
        ?firing rdf:type t:Firing;
                t:has_sourceMarking ?marking.
      }
      ?marking t:includes_markingOfPlace ?mop.
      ?mop t:has_place ?place;
          t:has_multisetOfTokens ?multiset.
      OPTIONAL {
        ?multiset t:has_basisSet ?basis_set.
        ?basis_set t:has_data ?data;
                    t:has_multiplicity ?multiplicity.
        ?data t:has_value ?value.
      }
      FILTER (BOUND(?basis_set))
      BIND(?place as ?id)
    }
    `;
  },
  'insert-calculated-multiset-terms': ({
    calculatedTerms,
    aboxEndpointURL,
    tboxEndpointURL,
  }: {
    calculatedTerms: {
      [termId: string]:
        | {
            basisSets: Array<{
              data: unknown;
              multiplicity: number;
            }>;
          }
        | unknown;
    };
    aboxEndpointURL: string;
    tboxEndpointURL: string;
  }): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    WITH <${aboxEndpointURL}>
    INSERT {
      ?cpn t:has_marking ?initial_marking;
           t:has_initialMarking ?initial_marking.
      ?initial_marking rdf:type t:Marking;
                       t:includes_markingOfPlace ?marking_of_place.
      ?marking_of_place rdf:type t:MarkingOfPlace;
                        t:has_place ?place;
                        t:has_multisetOfTokens ?multiset.
      ?arc t:has_multisetOfTerms ?multiset.
      ?multiset rdf:type t:Multiset;
                          t:has_basisSet ?basis_set.
      ?basis_set rdf:type t:BasisSet;
                      t:has_multiplicity ?multiplicity;
                      t:has_data ?bs_data.
      ?bs_data rdf:type t:Data;
                    t:has_value ?bs_data_value.
      ?eval rdf:type t:Evaluation;
                t:has_term ?term;
                t:has_data ?eval_data.
      ?eval_data rdf:type t:Data;
                 t:has_value ?eval_data_value.
    }
    WHERE {
      GRAPH <${tboxEndpointURL}> {
        ?cpn rdf:type t:CPN.
      }
      OPTIONAL {
        ?cpn t:has_initialMarking ?_im.
      }
      # FILTER (!BOUND(?_im))
      BIND(
        IF(BOUND(?_im), ?_im, IRI(CONCAT(STR(a:), "marking_", STRUUID()))) as ?initial_marking
      )
      ${Object.keys(calculatedTerms)
        .map((termId) => {
          const multiset = <
            {
              basisSets: Array<{
                data: unknown;
                multiplicity: number;
              }>;
            }
          >calculatedTerms[termId];
          return `{
          OPTIONAL {
            ?place rdf:type t:Place;
                   t:has_initialTokens <${termId}>.
            BIND(IRI(CONCAT(STR(a:), "mop_", STRUUID())) as ?marking_of_place)
          }
          OPTIONAL {
            ?arc rdf:type t:Arc;
                 t:has_annotation <${termId}>.
          }
          BIND(IRI(CONCAT(STR(a:), "mul_", STRUUID())) as ?multiset)
          ${multiset.basisSets
            .map(
              ({ data, multiplicity }) => `{
            #basisSet
            BIND(IRI(CONCAT(STR(a:), "bs_", STRUUID())) as ?basis_set)
            BIND(${multiplicity} as ?multiplicity)
            BIND(IRI(CONCAT(STR(a:), "data_", STRUUID())) as ?bs_data)
            BIND("${JSON.stringify(data).replace(
              /"/g,
              '\\"'
            )}" as ?bs_data_value)
          }`
            )
            .join(' UNION ')}
          BIND(IRI(CONCAT(STR(a:), "eval_", STRUUID())) as ?eval)
          BIND(<${termId}> as ?term)
          BIND(IRI(CONCAT(STR(a:), "data_", STRUUID())) as ?eval_data)
          BIND("${JSON.stringify(multiset).replace(
            /"/g,
            '\\"'
          )}" as ?eval_data_value)
        }`;
        })
        .join(' UNION ')}
    }`;
  },
  'set-raw-bindings': (
    bindings: Array<{
      variableName: string;
      value: string;
      tokenUri: string;
      annoChunkUri: string;
    }>
  ): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    WITH <http://localhost:3030/ontonet/data/abox>
    INSERT {
      ?binding rdf:type t:Binding;
           t:has_variable ?variable;
           t:has_data ?data;
           t:has_token ?token_bs;
           t:has_annotationChunk ?annotation_chunk_bs.
      ?data rdf:type t:Data;
            t:has_value ?value.
    }
    WHERE {
      ${bindings.map(
        (b) => `{
        BIND(IRI(CONCAT(STR(a:), "binding_", STRUUID())) as ?binding)
        BIND(IRI(CONCAT(STR(a:), "data_", STRUUID())) as ?data)
        ?variable rdf:type t:Variable;
                t:has_value "${b.variableName}".
      BIND("${b.value.replace(/"/g, '\\"')}" as ?value)
      BIND(<${b.tokenUri}> as ?token_bs)
      BIND(<${b.annoChunkUri}> as ?annotation_chunk_bs)
      }`
      ).join(`
      UNION
      `)}
    }`;
  },
  'get-leaf-bindings': (): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    SELECT ?transition ?annotation_bs ?token_bs (?binding as ?id)
    FROM <http://localhost:3030/ontonet/data/tbox>
    FROM <http://localhost:3030/ontonet/data/abox>
    WHERE {
      ?arc rdf:type t:Arc;
           t:has_targetNode ?transition;
           t:has_multisetOfTerms ?annotation_ms.
      ?annotation_ms t:has_basisSet ?annotation_bs.
      ?binding rdf:type t:Binding;
               t:has_token ?token_bs;
               t:has_annotationChunk ?annotation_bs.
      # Bindings must be leaf (free)
      FILTER NOT EXISTS {
        ?transition_mode rdf:type t:TransitionMode;
                         t:has_binding ?binding.
      }
    }
    `;
  },
  'insert-leaf-bindings-combinations': (bindingsData: {
    [transition: string]: {
      [annotation_bs: string]: {
        [token_bs: string]: { [binding_var: string]: string };
      };
    };
  }): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    WITH <http://localhost:3030/ontonet/data/abox>
    INSERT {
      ?transition_mode rdf:type t:TransitionMode;
                       t:has_binding ?binding;
                       t:has_transition ?transition.
    }
    WHERE {
      # transition level
      ${Object.keys(bindingsData)
        .map((transitionId) => {
          const annotations = bindingsData[transitionId];
          const allBindings = Object.values(annotations).reduce(
            (acc, tokens) => ({
              ...acc,
              ...Object.values(tokens).reduce(
                (accB, bindings) => ({ ...accB, ...bindings }),
                {}
              ),
            }),
            {}
          );
          return `{
          BIND(<${transitionId}> as ?transition)
          
          # annotation chunk level
          ${Object.values(annotations)
            .map((tokens) => {
              return `{
              ${Object.values(tokens)
                .map((bindings) => {
                  const [variables, ids] = Object.keys(bindings).reduce(
                    (acc, variable) => {
                      const id = bindings[variable];
                      acc[0].push(variable);
                      acc[1].push(id);
                      return acc;
                    },
                    [[], []]
                  );
                  return `VALUES (${variables
                    .map((v) => `?${v}`)
                    .join(' ')}) { (${ids
                    .map((v) => `<${v}>`)
                    .join(' ')}) (${'t:NULL '
                    .repeat(ids.length)
                    .slice(0, -1)}) }`;
                })
                .join('\n')}
              # at least one token was chosen
              FILTER (${Object.values(tokens)
                .map((bindings) => `?${Object.keys(bindings)[0]} != t:NULL`)
                .join(' || ')})
            }`;
            })
            .join('\n')}
          
          OPTIONAL {
            BIND(IRI(CONCAT(STR(a:), "tm_", STRUUID())) as ?transition_mode)
          }
          
          ${Object.keys(allBindings)
            .map((variable) => {
              const id = allBindings[variable];
              return `{
              VALUES ?${variable} { <${id}> }
              BIND (?${variable} as ?binding)
            }`;
            })
            .join(' UNION ')}
        }`;
        })
        .join(' UNION ')}
    }
    `;
  },
  'filter-raw-transition-modes': (): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    WITH <http://localhost:3030/ontonet/data/abox>
    DELETE {
      ?transition_mode rdf:type t:TransitionMode;
                       t:has_binding ?binding;
               t:has_transition ?transition.
    }
    WHERE {
      {
        SELECT DISTINCT ?transition_mode
        WHERE {
          {
            # bindings do not match
            ?transition_mode rdf:type t:TransitionMode.
            FILTER EXISTS {
              ?transition_mode rdf:type t:TransitionMode;
                                   t:has_binding ?binding1;
                                   t:has_binding ?binding2.
              FILTER (?binding1 != ?binding2)
              ?binding1 t:has_variable ?variable1;
                        t:has_data ?data1.
              ?binding2 t:has_variable ?variable2;
                        t:has_data ?data2.
              ?variable1 t:has_value ?variable1_name.
              ?variable2 t:has_value ?variable2_name.
              FILTER (?variable1_name = ?variable2_name)
              ?data1 t:has_value ?value1.
              ?data2 t:has_value ?value2.
              FILTER (?value1 != ?value2)
            }
          }
          UNION
          {
            # not enough tokens
            {
              SELECT ?transition_mode ((?n + SUM(?diff)) as ?res)
              WHERE {
                {
                  SELECT DISTINCT ?transition_mode ?anno_chunk_bs ?token_bs
                  WHERE {
                    ?transition_mode rdf:type t:TransitionMode;
                                     t:has_binding ?binding.
                    ?binding t:has_annotationChunk ?anno_chunk_bs;
                             t:has_token ?token_bs.
                  }
                }
    
                ?anno_chunk_bs t:has_multiplicity ?anno_chunk_multiplicity.
                ?token_bs t:has_multiplicity ?token_multiplitity.
    
                BIND (?anno_chunk_multiplicity as ?k)
                BIND (?token_multiplitity as ?n)
    
                {
                  SELECT DISTINCT ?anno_chunk_bs (SUM(?n) as ?sum_n)
                  WHERE {
                    {
                      SELECT DISTINCT ?anno_chunk_bs ?token_bs
                      WHERE {
                        ?transition_mode t:has_binding ?binding.
                        ?binding t:has_annotationChunk ?anno_chunk_bs;
                                 t:has_token ?token_bs.
                      }
                    }
                    ?token_bs t:has_multiplicity ?token_multiplitity.
                    BIND (?token_multiplitity as ?n)
                  }
                  GROUP BY ?anno_chunk_bs
                }
                BIND ((?sum_n - ?n - ?k) as ?diff)
              }
              GROUP BY ?transition_mode ?token_bs ?n
            }
            FILTER (?res < 0)
          }
        }
      }
      
      {
        ?transition_mode t:has_binding ?binding.
      }
      UNION
      {
        ?transition_mode t:has_transition ?transition.
      }
    }
    `;
  },
  'get-leaf-transition-modes': (): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    SELECT ?id
    FROM <http://localhost:3030/ontonet/data/tbox>
    FROM <http://localhost:3030/ontonet/data/abox>
    WHERE {
      ?transition_mode rdf:type t:TransitionMode.
      # Transition modes must be leaf (free)
      FILTER NOT EXISTS {
        ?firing rdf:type t:Firing;
                t:has_multisetOfTransitionModes ?multiset_tm.
        ?multiset_tm t:has_basisSet ?basis_set_tm.
        ?basis_set_tm t:has_data ?transition_mode.
      }
      BIND (?transition_mode as ?id)
    }
    `;
  },
  'insert-firing': (transitionModeId: string): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    WITH <http://localhost:3030/ontonet/data/abox>
    INSERT {
      ?cpn t:has_firing ?firing.
      ?firing rdf:type t:Firing;
              t:has_sourceMarking ?marking;
              t:has_multisetOfTransitionModes ?multiset_tm.
      ?multiset_tm t:has_basisSet ?basis_set_tm.
      ?basis_set_tm t:has_data ?transition_mode;
                    t:has_multiplicity 1.
    }
    #SELECT *
    #FROM <http://localhost:3030/ontonet/data/tbox>
    #FROM <http://localhost:3030/ontonet/data/abox>
    WHERE {
      GRAPH <http://localhost:3030/ontonet/data/tbox> {
          ?cpn rdf:type t:CPN.
      }
      ?cpn t:has_marking ?marking.
      FILTER NOT EXISTS {
        ?cpn t:has_firing ?other_firing.
        ?other_firing t:has_sourceMarking ?marking.
      }
      ?transition_mode rdf:type t:TransitionMode. # replace this to the explicit <id>
      BIND (<${transitionModeId}> as ?transitionMode)
      
      BIND(IRI(CONCAT(STR(a:), "firing_", STRUUID())) as ?firing)
      BIND(IRI(CONCAT(STR(a:), "mul_", STRUUID())) as ?multiset_tm)
      BIND(IRI(CONCAT(STR(a:), "bs_", STRUUID())) as ?basis_set_tm)
    }
    `;
  },
  'analyze-ontology': (): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    SELECT ?type ?id
    FROM <http://localhost:3030/ontonet/data/tbox>
    FROM <http://localhost:3030/ontonet/data/abox>
    WHERE {
      ?firing rdf:type t:Firing.
      FILTER NOT EXISTS {
        # last not processed firing
        ?firing t:has_targetMarking ?marking.
      }
      BIND ("firing" as ?type)
      BIND (?firing as ?id)
    }
    `;
  },
  'get-firing-data': (firingId: string): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    SELECT ?type
    ?id
    ?variable_name ?value
    ?anno_chunk_bs ?token_bs
    FROM <http://localhost:3030/ontonet/data/tbox>
    FROM <http://localhost:3030/ontonet/data/abox>
    WHERE {
      <${firingId}> t:has_multisetOfTransitionModes ?multiset.
      ?multiset t:has_basisSet ?basis_set.
      ?basis_set t:has_data ?transition_mode.
      
      {
        BIND ("multiplicity" as ?type)
        {
          SELECT DISTINCT ?transition_mode ?id ?value
          WHERE {
            ?transition_mode t:has_binding ?binding.
            {
              ?binding t:has_annotationChunk ?anno_chunk_bs.
              ?anno_chunk_bs t:has_multiplicity ?anno_chunk_multiplicity.
              BIND (?anno_chunk_bs as ?id)
              BIND (?anno_chunk_multiplicity as ?value)
            }
            UNION
            {
              ?binding t:has_token ?token_bs.
              ?token_bs t:has_multiplicity ?token_multiplicity.
              BIND (?token_bs as ?id)
              BIND (?token_multiplicity as ?value)
            }
          }
        }
      }
      UNION
      {
        BIND ("relation" as ?type)
        {
          SELECT DISTINCT ?transition_mode ?anno_chunk_bs ?token_bs
          WHERE {
            ?transition_mode t:has_binding ?binding.
            ?binding t:has_annotationChunk ?anno_chunk_bs;
                     t:has_token ?token_bs.
          }
        }
      }
      UNION
      {
        BIND ("transition" as ?type)
        {
          SELECT ?transition_mode ?id
          WHERE {
            ?transition_mode t:has_transition ?transition.
            BIND (?transition as ?id)
          }
        }
      }
      UNION
      {
        BIND ("binding" as ?type)
        {
          SELECT DISTINCT ?transition_mode ?variable_name ?value
          WHERE {
            ?transition_mode t:has_binding ?binding.
            ?binding t:has_variable ?variable;
                 t:has_data ?data.
            ?variable t:has_value ?variable_name.
            ?data t:has_value ?value.
          }
        }
      }
    }
    ORDER BY ?type
    `;
  },
  'get-removing-tokens-counts': ({
    multiplicities,
    chunksRelations,
    tokensRelations,
  }: {
    multiplicities: Record<string, number>;
    chunksRelations: Record<string, Array<string>>;
    tokensRelations: Record<string, Array<string>>;
  }): string => {
    const chunksIds = Object.keys(chunksRelations);
    const tokensIds = Object.keys(tokensRelations);
    const chunksVariables = chunksIds.map((id) => `?${id}`).join(' ');
    const tokensVariables = tokensIds.map((id) => `?${id}`).join(' ');

    const getNumbersSequence = (end): string => {
      const numbers = [];
      for (let i = 0; i <= end; i += 1) {
        numbers.push(i);
      }
      return numbers.join(' ');
    };

    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    SELECT ${tokensVariables} # ?n1 ?n2 ?n3
    FROM <http://localhost:3030/ontonet/data/tbox>
    FROM <http://localhost:3030/ontonet/data/abox>
    WHERE {
      ${chunksIds
        .map((id) => `BIND (${multiplicities[id]} as ?${id})`)
        .join('\n')}
      # BIND (2 as ?k1)
      # BIND (4 as ?k2)
      # BIND (1 as ?k3)
      
      {
        SELECT
        ${tokensVariables} # ?n1 ?n2 ?n3
        ${chunksVariables} # ?k1 ?k2 ?k3
        WHERE {
          ${tokensIds
            .map((tId) => {
              const tokenMultiplicity = multiplicities[tId];
              const relatedChunksIds = tokensRelations[tId];
              return `{
                ${relatedChunksIds
                  .map((chId) => {
                    const chunkMultiplicity = multiplicities[chId];
                    return `VALUES ?ch${tId}_${chId} { ${getNumbersSequence(
                      Math.min(tokenMultiplicity, chunkMultiplicity)
                    )} }`;
                  })
                  .join('\n')}
                # VALUES ?ch21 { 0 1 2 }   #chunk1, mul: 2, [0, 2]
                # VALUES ?ch22 { 0 1 2 3 } #chunk2, mul: 4, [0, 3]
                BIND (${relatedChunksIds
                  .map((chId) => `?ch${tId}_${chId}`)
                  .join(' + ')} as ?${tId})
                # BIND (?ch21 + ?ch22 as ?n2)
                FILTER (?${tId} <= ${tokenMultiplicity})
                # FILTER (?n2 <= 3) #mul: 3, got 2nd combination if mul: 4
              }`;
            })
            .join('\n')}
          
          {
            #token2
            VALUES ?ch21 { 0 1 2 }   #chunk1, mul: 2, [0, 2]
            VALUES ?ch22 { 0 1 2 3 } #chunk2, mul: 4, [0, 3]
            BIND (?ch21 + ?ch22 as ?n2)
            FILTER (?n2 <= 3) #mul: 3, got 2nd combination if mul: 4
          }
          
          ${chunksIds
            .map((chId) => {
              const relatedTokensIds = chunksRelations[chId];
              return `BIND ((${relatedTokensIds
                .map((tId) => `?ch${tId}_${chId}`)
                .join(' + ')}) as ?${chId})`;
            })
            .join('\n')}
          # BIND ((?ch11 + ?ch21) as ?k1)
          # BIND ((?ch22 + ?ch32) as ?k2)
          # BIND ((?ch33) as ?k3)
        }
      }
    }
    LIMIT 1
    `;
  },
  'perform-transition': (
    firing: string,
    removingTokens: { [tokenId: string]: number },
    insertionTokens: {
      [placeId: string]: Array<{ value: string; multiplicity: number }>;
    }
  ): string => {
    const removingTokensUUIDs = Object.keys(removingTokens)
      .map((id) => `<${id}>`)
      .join(' ');
    const insertionTokensUUIDs = Object.keys(insertionTokens)
      .map((id) => `<${id}>`)
      .join(' ');
    const insertionTokensPlacesAndValues = Object.keys(insertionTokens)
      .map((placeId) =>
        insertionTokens[placeId]
          .map(({ value }) => `(<${placeId}> "${value}")`)
          .join(' ')
      )
      .join(' ');
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    WITH <http://localhost:3030/ontonet/data/abox>
    INSERT {
      ?cpn t:has_marking ?marking.
      <${firing}> t:has_targetMarking ?marking.
      ?marking rdf:type t:Marking.
        
      ?marking t:includes_markingOfPlace ?stable_marking_of_place;
               t:includes_markingOfPlace ?new_marking_of_place.
      
      ?new_marking_of_place rdf:type t:MarkingOfPlace;
                            t:has_place ?place;
                            t:has_multisetOfTokens ?new_multiset.
      ?new_multiset rdf:type t:Multiset.
        
      ?new_multiset t:has_basisSet ?stable_token_bs;
                    t:has_basisSet ?new_token_bs.
    
      ?new_token_bs rdf:type t:BasisSet;
                    t:has_multiplicity ?multiplicity;
                    t:has_data ?bs_data.
      ?bs_data rdf:type t:Data;
               t:has_value ?token_value.
    }
    WHERE {
      BIND(IRI(CONCAT(STR(a:), "marking_", STRUUID())) as ?marking)
      <${firing}> t:has_targetMarking ?source_marking.
      {
        GRAPH <http://localhost:3030/ontonet/data/tbox> {
            ?cpn rdf:type t:CPN.
        }
      }
      UNION
      {
        <${firing}> t:has_sourceMarking ?source_marking.
        
        {
          #stable mop
          ?source_marking t:includes_markingOfPlace ?marking_of_place.
          
          MINUS {
            # minus mop with tokens being removed
            ?marking_of_place t:has_multisetOfTokens ?multiset.
            ?multiset t:has_basisSet ?token_bs.
            VALUES ?token_bs { ${removingTokensUUIDs} }
            # VALUES ?token_bs { <token1> <token2> <token3> }
          }
          
          MINUS {
            # minus mop with tokens being inserted
            ?marking_of_place t:has_place ?place.
            VALUES ?place { ${insertionTokensUUIDs} }
            # VALUES ?place { <place1> a:pl_P1 }
          }
          
          BIND(?marking_of_place as ?stable_marking_of_place)
        }
        UNION
        {
          #new mop
          ?source_marking t:includes_markingOfPlace ?marking_of_place.
          
          FILTER(
            EXISTS {
              # tokens are being removed
              ?marking_of_place t:has_multisetOfTokens ?multiset.
              ?multiset t:has_basisSet ?token_bs.
              VALUES ?token_bs { ${removingTokensUUIDs} }
              # VALUES ?token_bs { <token1> <token2> <token3> }
            } 
            || EXISTS {
              # tokens are being inserted
              ?marking_of_place t:has_place ?place.
              VALUES ?place { ${insertionTokensUUIDs} }
              # VALUES ?place { <place1> a:pl_P1 }
            }
          )
          
          BIND(IRI(CONCAT(STR(a:), "mop_", STRUUID())) as ?new_marking_of_place)
          ?marking_of_place t:has_place ?place;
                            t:has_multisetOfTokens ?multiset.
          BIND(IRI(CONCAT(STR(a:), "mul_", STRUUID())) as ?new_multiset)
          
          {
            # stable bs
            ?multiset t:has_basisSet ?token_bs.
    
            MINUS {
              # minus tokens being removed
              VALUES ?token_bs { ${removingTokensUUIDs} }
            }
    
            MINUS {
              # minus tokens being inserted
              ?token_bs t:has_data ?token_data.
              ?token_data t:has_value ?token_value.
              VALUES (?place ?token_value) { ${insertionTokensPlacesAndValues} }
              # VALUES (?place ?token_value) { (<pl1> "{json: \"string\"}") (<pl2> "\"representation\"") }
            }
    
            BIND(IRI(CONCAT(STR(a:), "bs_", STRUUID())) as ?stable_token_bs)
          }
          UNION
          {
            # new bs
            ?multiset t:has_basisSet ?token_bs.
    
            FILTER(
              EXISTS {
                VALUES ?token_bs { <token1> <token2> <token3> }
              } 
              || EXISTS {
                ?token_bs t:has_data ?token_data.
                ?token_data t:has_value ?token_value.
                VALUES ?token_value { "{json: \"string\"}" "\"representation\"" }
              }
            )
            
            BIND(IRI(CONCAT(STR(a:), "bs_", STRUUID())) as ?new_token_bs)
            ?token_bs t:has_multiplicity ?token_multiplicity;
                      t:has_data ?token_data.
            ?token_data t:has_value ?token_value.
            BIND(IRI(CONCAT(STR(a:), "data_", STRUUID())) as ?bs_data)
            
            OPTIONAL {
              # tokens to remove
              VALUES (?token_bs ?del_multiplicity) { (<token1> 1) (<token2> 3) (<token3> 1) }
            }
            
            OPTIONAL {
              # tokens to insert
              VALUES (?place ?token_value ?add_multiplicity) { (<place1> "\"Hello\"" 1) }
            }
            
            BIND ((?token_multiplicity - ?del_multiplicity + ?add_multiplicity) as ?multiplicity)
            FILTER (?multiplicity > 0)
            
          }
          UNION
          {
            # brand new bs
            BIND(IRI(CONCAT(STR(a:), "bs_", STRUUID())) as ?new_token_bs)
            VALUES (?place ?token_value ?multiplicity) { (a:pl_P1 "\"Hellooo\"" 1) }
            MINUS {
              ?multiset t:has_basisSet ?token_bs.
              ?token_bs t:has_data ?token_data.
              ?token_data t:has_value ?token_value.
            }
            
            BIND(IRI(CONCAT(STR(a:), "data_", STRUUID())) as ?bs_data)
          }
        }
      }
    };
    WITH <http://localhost:3030/ontonet/data/abox>
    DELETE {
      # removing unused transition modes
      ?transition_mode rdf:type t:TransitionMode;
                       t:has_transition ?transition;
                       t:has_binding ?binding.
    }
    WHERE {
      # leaf transition modes
      ?transition_mode rdf:type t:TransitionMode.
      FILTER NOT EXISTS {
        ?firing rdf:type t:Firing;
                t:has_multisetOfTransitionModes ?multiset_tm.
        ?multiset_tm t:has_basisSet ?basis_set_tm.
        ?basis_set_tm t:has_data ?transition_mode.
      }
    };
    WITH <http://localhost:3030/ontonet/data/abox>
    DELETE {
      # removing unused bindings
      ?binding rdf:type t:Binding;
               t:has_variable ?variable;
               t:has_data ?data;
               t:has_annotationChunk ?anno_chunk_bs;
               t:has_token ?token_bs.
      ?data rdf:type t:Data;
            t:has_value ?value.
    }
    WHERE {
      # leaf bindings
      ?binding rdf:type t:Binding;
               t:has_variable ?variable;
               t:has_data ?data;
               t:has_annotationChunk ?anno_chunk_bs;
               t:has_token ?token_bs.
      ?data t:has_value ?value.
      FILTER NOT EXISTS {
        ?transition_mode rdf:type t:TransitionMode;
                         t:has_binding ?binding.
      }
    }`;
  },
};
