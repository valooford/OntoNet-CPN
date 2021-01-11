import $ from 'jquery';

import {
  TransitionsResponse,
  TransitionInputDataResponse,
  PlacesMarkingsResponce,
  PlacesMarkingsData,
  TransitionInputData,
} from './types';

export default class Reasoner {
  private endpointUrl: string;

  constructor(endpointUrl: string) {
    this.setEndpointUrl(endpointUrl);
  }

  setEndpointUrl(url: string): void {
    this.endpointUrl = url;
  }

  async run(): Promise<void> {
    const [transitionsURIs, placesMarkings] = await Promise.all([
      this.getTransitionsURIs(),
      this.getPlacesMarkings(),
    ]);
    console.log('placesMarkings', placesMarkings);
    await Promise.all(
      transitionsURIs.map(async (uri) => {
        const inputData = await this.getTransitionInputData(uri);
        console.log(`inputData for ${uri}`, inputData);
        // reasoning...
        // forming transition modes
      })
    );
  }

  private async getPlacesMarkings(): Promise<PlacesMarkingsData> {
    const response: PlacesMarkingsResponce = await $.post({
      url: `${this.endpointUrl}/sparql`,
      data: {
        query: `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          PREFIX core: <http://www.onto.net/core/>
          PREFIX js: <http://www.onto.net/js/>
          PREFIX : <http://www.experimental.onto.net/js-core/net/heads-and-tails/>
          
          SELECT ?type ?place
          ?place_colorSet_name 
          ?token_value ?multiplicity
          FROM <urn:x-arq:DefaultGraph>
          FROM <${this.endpointUrl}/data/net>
          WHERE {
            ?place rdf:type core:Place.
            {
              bind("place" as ?type)
              ?place core:has_colorSet ?place_colorSet.
              ?place_colorSet core:has_name ?place_colorSet_name.
            }
            UNION
            {
              OPTIONAL {
                bind("token" as ?type)
                ?place core:has_marking ?place_marking.
                ?place_marking core:has_multisetOfTokens ?multisetOfTokens.
                ?multisetOfTokens core:includes_basisSet ?basisSet.
                ?basisSet core:has_data ?token;
                          core:has_multiplicity ?multiplicity.
                ?token core:has_value ?token_value.
              }
            }
          }
          ORDER BY ?place ?type
        `,
      },
    });
    const placesMarkings = response.results.bindings.reduce(
      (markings: PlacesMarkingsData, row) => {
        const placeId = row.place.value;
        if (row.type.value === 'place') {
          // eslint-disable-next-line no-param-reassign
          markings[placeId] = {
            colorSet: row.place_colorSet_name.value,
            tokens: [],
          };
        } else if (row.type.value === 'token') {
          markings[placeId].tokens.push({
            value: row.token_value.value,
            multiplicity: Number(row.multiplicity?.value) ?? 1,
          });
        }
        return markings;
      },
      {}
    );
    return placesMarkings;
  }

  private async getTransitionsURIs(): Promise<string[]> {
    const response: TransitionsResponse = await $.post({
      url: `${this.endpointUrl}/sparql`,
      data: {
        query: `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          PREFIX core: <http://www.onto.net/core/>
          PREFIX js: <http://www.onto.net/js/>
          PREFIX : <http://www.experimental.onto.net/js-core/net/heads-and-tails/>
          
          SELECT ?transition
          FROM <${this.endpointUrl}/data/net>
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
  ): Promise<TransitionInputData> {
    const uri = `<${transitionUri}>`;
    const response: TransitionInputDataResponse = await $.post({
      url: `${this.endpointUrl}/sparql`,
      data: {
        query: `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          PREFIX core: <http://www.onto.net/core/>
          PREFIX js: <http://www.onto.net/js/>
          PREFIX : <http://www.experimental.onto.net/js-core/net/heads-and-tails/>
          
          SELECT ?type
          ?code ?guard_value #transition
          ?arc_i ?arcan_constant_name ?term_value ?multiplicity ?place_i #arcs
          FROM <${this.endpointUrl}/data/net>
          WHERE {
            {
              bind("transition" as ?type)
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
              bind("arcs" as ?type)
              #input arcs
              ?arc_i core:has_targetNode ${uri};
                    core:has_sourceNode ?place_i.
              OPTIONAL {
                ?arc_i core:has_annotation ?arc_i_annotation.
                ?arc_i_annotation core:has_multisetOfTerms ?arcan_multiset.
                OPTIONAL {
                  ?arcan_multiset rdf:type core:Constant.
                  BIND (?arcan_multiset as ?arcan_constant)
                  ?arcan_constant core:has_name ?arcan_constant_name.
                }
                OPTIONAL {
                  ?arcan_multiset core:includes_basisSet ?basisSet.
                  ?basisSet core:has_data ?term;
                              core:has_multiplicity ?multiplicity.
                  ?term core:has_value ?term_value.
                }
              }
            }
          }
          ORDER BY DESC(?type)
        `,
      },
    });
    const transitionInputData = response.results.bindings.reduce(
      (data: TransitionInputData, row) => {
        switch (row.type.value) {
          case 'transition':
            data.code = row.code?.value; // eslint-disable-line no-param-reassign
            data.guard = row.guard_value?.value ?? 'true'; // eslint-disable-line no-param-reassign
            break;
          case 'arcs':
            // eslint-disable-next-line no-param-reassign
            data.arcs[row.arc_i.value] = {
              place: row.place_i.value,
              constant: row.arcan_constant_name?.value,
              term: row.term_value?.value,
              multiplicity: row.multiplicity?.value ?? (row.term_value && '1'),
            };
            break;
          default:
        }
        return data;
      },
      { arcs: {} }
    );
    return transitionInputData;
  }
}
