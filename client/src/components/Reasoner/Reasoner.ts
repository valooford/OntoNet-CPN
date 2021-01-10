import $ from 'jquery';

import {
  TransitionsResponse,
  TransitionInputDataResponse,
  ProcessedTransitionInputData,
} from './types';

export default class Reasoner {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  setEndpointUrl(url: string): void {
    this.url = url;
  }

  async run(): Promise<void> {
    const transitionsURIs = await this.getTransitionsURIs();
    await Promise.all(
      transitionsURIs.map(async (uri) => {
        const inputData = await this.getTransitionInputData(uri);
        // reasoning...
        const { places, arcs, transition } = inputData.results.bindings.reduce(
          (obj: ProcessedTransitionInputData, data) => {
            const result = { ...obj };
            if (data.transition_name) {
              result.transition = {
                code: data.code.value,
                guard: data.guard_value.value,
              };
            } else {
              result.arcs[data.arc_i.value] = {
                annotation: {
                  type: data.arcan_constant_name ? 'constant' : 'multiset',
                  constant: data.arcan_constant_name?.value,
                  term: data.term_value?.value,
                  multiplicity: data.a_multiplicity?.value,
                },
              };
              result.places[data.place_i.value] = {
                tokenValue: data.token_value.value,
                tokenMultiplicity: data.p_multiplicity.value,
              };
            }
            return result;
          },
          { places: {}, arcs: {}, transition: { code: null, guard: null } }
        );
        const processed = { places, arcs, transition };
        console.log('processed: ', processed);
        // forming transition modes
        return processed;
      })
    );
  }

  private async getTransitionsURIs(): Promise<string[]> {
    const response: TransitionsResponse = await $.post({
      url: `${this.url}/sparql`,
      data: {
        query: `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          PREFIX core: <http://www.onto.net/core/>
          PREFIX js: <http://www.onto.net/js/>
          PREFIX : <http://www.experimental.onto.net/js-core/net/heads-and-tails/>
          
          SELECT ?transition
          FROM <${this.url}/data/net>
          WHERE {
            ?transition rdf:type core:Transition.
          }
          ORDER BY ?transition
        `,
      },
    });
    return response.results.bindings.map((row) => row.transition.value);
  }

  private async getTransitionInputData(
    transitionUri: string
  ): Promise<TransitionInputDataResponse> {
    const uri = `<${transitionUri}>`;
    return $.post({
      url: `${this.url}/sparql`,
      data: {
        query: `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          PREFIX core: <http://www.onto.net/core/>
          PREFIX js: <http://www.onto.net/js/>
          
          SELECT ?transition_name ?code ?guard_value
          ?arc_i ?arcan_constant ?term_value ?a_multiplicity
          ?place_i ?token_value ?p_multiplicity
          FROM <${this.url}/data/net>
          WHERE {
            {
              #name
              ${uri} core:has_name ?transition_name.
              #code
              OPTIONAL {
                ${uri} core:has_code ?code.
              }
              #guard
              OPTIONAL {
                ${uri} core:has_guard ?guard.
                ?guard core:has_value ?_guard_value.
              }
              BIND (if(!bound(?_guard_value), "true", ?_guard_value) as ?guard_value)
            }
            UNION
            {
              #input arcs
              ?arc_i core:has_targetNode ${uri};
                    core:has_sourceNode ?place_i.
              OPTIONAL {
                ?arc_i core:has_annotation ?arc_i_annotation.
                ?arc_i_annotation core:has_multisetOfTerms ?arcan_multiset.
                OPTIONAL {
                  ?arcan_multiset rdf:type core:Constant.
                  BIND (?arcan_multiset as ?arcan_constant)
                }
                OPTIONAL {
                  ?arcan_multiset core:includes_basisSet ?a_basisSet.
                  ?a_basisSet core:has_data ?term;
                              core:has_multiplicity ?a_multiplicity.
                  ?term core:has_value ?term_value.
                }
              }
              ?place_i rdf:type core:Place;
                      core:has_marking ?place_i_marking.
              OPTIONAL {
                ?place_i_marking core:has_multisetOfTokens ?multisetOfTokens.
                ?multisetOfTokens core:includes_basisSet ?p_basisSet.
                ?p_basisSet core:has_data ?token;
                            core:has_multiplicity ?p_multiplicity.
                ?token core:has_value ?token_value.
              }
            }
          }
        `,
      },
    });
  }
}
