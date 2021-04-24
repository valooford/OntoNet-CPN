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
  }) => {
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
          const multiset = calculatedTerms[termId];
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
};
