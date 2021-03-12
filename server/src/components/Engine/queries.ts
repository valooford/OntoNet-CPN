export default {
  'reasoning-select': (): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    SELECT ?type ?id
    #store ()
    ?guard_term ?guard ?code_term ?code
    #calc (places & arcs)
    ?term ?term_value
    ?source ?target ?arc_type
    #FROM <urn:x-arq:DefaultGraph>
    FROM <http://localhost:3030/ontonet/data/tbox>
    FROM <http://localhost:3030/ontonet/data/abox>
    WHERE {
      BIND (t:cpn_CPN as ?cpn)
      {
        ?cpn t:has_node ?transition.
        ?transition rdf:type t:Transition;
                    t:has_guard ?guard_term.
        ?guard_term t:has_value ?guard.
        OPTIONAL {
          ?transition t:has_code ?code_term.
          ?code_term t:has_value ?code.
        }
        BIND (?transition as ?id)
        BIND ("transitions" as ?type)
      }
      UNION
      {
        ?cpn t:has_arc ?arc.
        ?arc rdf:type t:Arc;
             t:has_annotation ?term;
             t:has_sourceNode ?source;
             t:has_targetNode ?target.
        ?term t:has_value ?term_value.
        BIND (IF (EXISTS {?source rdf:type t:Place.}, "input", "output") as ?arc_type)
        BIND (?arc as ?id)
        BIND ("arcs" as ?type)
      }
      UNION
      {
        ?cpn t:has_node ?place.
        ?place rdf:type t:Place;
               t:has_initialTokens ?term.
        ?term t:has_value ?term_value.
        BIND (?place as ?id)
        BIND ("places" as ?type)
      }
    }`;
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
};
