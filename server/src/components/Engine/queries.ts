export default {
  'reasoning-select': (): string => {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX t: <http://www.onto.net/core/>
    PREFIX a: <http://www.onto.net/abox/heads-and-tails/>
    
    SELECT ?type ?id
    #store
    ?guard_term ?guard ?code_term ?code #type: "transition"
    #calc
    ?annotation_term ?annotation ?source ?target ?arc_type #type: "arc"
    ?init_tokens_term ?init_tokens #type: "place"
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
             t:has_annotation ?annotation_term;
             t:has_sourceNode ?source;
             t:has_targetNode ?target.
        ?annotation_term t:has_value ?annotation.
        BIND (IF (EXISTS {?source rdf:type t:Place.}, "input", "output") as ?arc_type)
        BIND (?arc as ?id)
        BIND ("arcs" as ?type)
      }
      UNION
      {
        ?cpn t:has_node ?place.
        ?place rdf:type t:Place;
               t:has_initialTokens ?init_tokens_term.
        ?init_tokens_term t:has_value ?init_tokens.
        BIND (?place as ?id)
        BIND ("places" as ?type)
      }
    }`;
  },
};
