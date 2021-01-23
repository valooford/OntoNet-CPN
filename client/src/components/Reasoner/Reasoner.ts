import $ from 'jquery';

import {
  ConfigurationResponse,
  Configuration,
  TransitionsResponse,
  TransitionInputDataResponse,
  PlacesMarkingsResponce,
  PlacesMarkingsData,
  TransitionInputData,
  PlacesMarkings,
  Multiset,
  BasisSet,
  Func,
  TransitionInputDataIntermediate,
} from './types';

export default class Reasoner {
  private endpointUrl: string;

  private configuration: Configuration;

  constructor(endpointUrl: string) {
    this.setEndpointUrl(endpointUrl);
    this.updateConfiguration();
  }

  setEndpointUrl(url: string): void {
    this.endpointUrl = url;
  }

  async updateConfiguration(): Promise<void> {
    const response: ConfigurationResponse = await $.post({
      url: `${this.endpointUrl}/sparql`,
      data: {
        query: `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          PREFIX core: <http://www.onto.net/core/>
          PREFIX js: <http://www.onto.net/js/>
          PREFIX : <http://www.experimental.onto.net/js-core/net/heads-and-tails/>
          
          SELECT ?type
          ?function ?function_type ?function_name ?function_arguments ?function_action ?function_domain ?function_range
          ?colorSet ?colorSet_name ?colorSet_declaration ?colorSet_constructor_name 
          ?variable_name ?variable_colorSet_name 
          ?constant ?constant_name ?constant_value ?constant_colorSet
          FROM <urn:x-arq:DefaultGraph>
          FROM <${this.endpointUrl}/data/net>
          WHERE {
            ?declarations rdf:type core:Declarations;
                          core:includes_statement ?statement.
            OPTIONAL {
              ?statement core:has_declarationOrder ?order.
            }
            {
              bind("function" as ?type).
              ?statement rdf:type core:Function.
              bind(?statement as ?function).
              ?function core:has_name ?function_name;
                        core:has_arguments ?function_arguments;
                        core:has_action ?function_action.
              OPTIONAL {
                ?function core:has_domain ?function_domain;
                          core:has_range ?function_range.
              }
              OPTIONAL {
                ?statement rdf:type core:Built-in.
                bind(IF (EXISTS {?statement rdf:type core:Constructor.}, "constructor", "builtIn") as ?function_type).
              }
            }
            UNION
            {
              bind("colorSet" as ?type).
              ?statement rdf:type core:ColorSet.
              bind(?statement as ?colorSet).
              ?colorSet core:has_name ?colorSet_name;
                        core:has_declaration ?colorSet_declaration.
              OPTIONAL {
                ?colorSet core:has_constructor ?colorSet_constructor.
                ?colorSet_constructor core:has_name ?colorSet_constructor_name.
              }
            }
            UNION
            {
              bind("variable" as ?type).
              ?statement rdf:type core:Variable.
              bind(?statement as ?variable).
              ?variable core:has_name ?variable_name;
                        core:has_colorSet ?variable_colorSet.
              ?variable_colorSet core:has_name ?variable_colorSet_name.
            }
            UNION
            {
              bind("constant" as ?type).
              ?statement rdf:type core:Constant.
              bind(?statement as ?constant).
              ?constant core:has_name ?constant_name;
                        core:has_value ?constant_value.
              OPTIONAL {
                ?constant core:has_colorSet ?constant_colorSet.
              }
            }
          }
          ORDER BY ?order DESC(?function) ?function_type DESC(?colorSet) DESC(?variable) DESC(?constant)
        `,
      },
    });
    // console.log('response: ', response);
    const records = response.results.bindings;
    this.configuration = records.reduce(
      (config: Configuration, record) => {
        const cfg = config;
        switch (record.type.value) {
          case 'function': {
            const argumentsList = record.function_arguments.value.split(', ');
            const action = record.function_action.value;
            cfg.functions[record.function_name.value] =
              // eslint-disable-next-line no-new-func
              <Func>new Function(...argumentsList, action);
            break;
          }
          case 'colorSet': {
            const name = record.colorSet_name.value;
            const declaration = record.colorSet_declaration.value;
            if (!record.colorSet_constructor_name) {
              cfg.colorSets[name] =
                // eslint-disable-next-line no-new-func
                new Function(`return ${declaration}`)();
            } else {
              const constructor = record.colorSet_constructor_name.value;
              cfg.colorSets[name] =
                // eslint-disable-next-line no-new-func
                new Function(
                  'context',
                  `with (context) {
                      return ${constructor}(${declaration})
                    }`
                )({ ...cfg.functions, ...cfg.colorSets });
            }
            break;
          }
          case 'variable': {
            cfg.variables[record.variable_name.value] =
              cfg.colorSets[record.variable_colorSet_name.value];
            break;
          }
          case 'constant': {
            const { value } = record.constant_value;
            cfg.constants[record.constant_name.value] =
              // eslint-disable-next-line no-new-func
              new Function(
                'context',
                `with (context) {
                    return ${value}
                  }`
              )(cfg.functions);
            break;
          }
          default:
        }
        return cfg;
      },
      {
        colorSets: {},
        variables: {},
        constants: {},
        functions: {},
      }
    );
    console.log('configuration: ', this.configuration);
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
        const transitionModes = Object.keys(inputData.arcs).reduce(
          (modes: Record<string, unknown>, arcId) => {
            const arcData = inputData.arcs[arcId];
            const markingsMultiset = placesMarkings[arcData.place].multiset;
            const arcBindings = Reasoner.getBindings(
              arcData.multiset,
              markingsMultiset
            );
            // eslint-disable-next-line no-param-reassign
            modes[arcId] = arcBindings;
            return modes;
          },
          {}
        );
        console.log('transitionModes:', transitionModes);
      })
    );
  }

  private static getBindings(
    template: Multiset,
    markings: Multiset
  ): Record<string, unknown> {
    console.log(template);
    console.log(markings);
    return {};
  }

  private async getPlacesMarkings(): Promise<PlacesMarkings> {
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
          ?token ?token_value ?multiplicity
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
    const placesMarkingsData = response.results.bindings.reduce(
      (markingsData: PlacesMarkingsData, row) => {
        const placeId = row.place.value;
        if (row.type.value === 'place') {
          // eslint-disable-next-line no-param-reassign
          markingsData[placeId] = {
            colorSet: row.place_colorSet_name.value,
            tokens: {},
          };
        } else if (row.type.value === 'token') {
          // eslint-disable-next-line no-param-reassign
          markingsData[placeId].tokens[row.token.value] = {
            value: row.token_value.value,
            multiplicity: Number(row.multiplicity?.value) ?? 1,
          };
        }
        return markingsData;
      },
      {}
    );
    const { Multiset, BasisSet } = this.configuration.functions;
    const placesMarkings = Object.keys(placesMarkingsData).reduce(
      (markings: PlacesMarkings, placeId) => {
        const data = placesMarkingsData[placeId];
        // eslint-disable-next-line no-param-reassign
        markings[placeId] = {
          colorSet: data.colorSet,
          multiset: <Multiset>new Multiset(
            Object.keys(data.tokens).reduce(
              (basisSets: Record<string, BasisSet>, tokenId) => {
                const tokenData = data.tokens[tokenId];
                const Value = this.configuration.colorSets[data.colorSet];
                // eslint-disable-next-line no-param-reassign
                basisSets[tokenId] = <BasisSet>(
                  new BasisSet(
                    JSON.stringify(new Value(JSON.parse(tokenData.value))),
                    tokenData.multiplicity
                  )
                );
                return basisSets;
              },
              {}
            )
          ),
        };
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
                ?arc_i ?place_i #arcs
                ?arcan_constant_name ?term_value ?multiplicity #arcs_data
          FROM <${this.endpointUrl}/data/net>
          WHERE {
            {
              BIND("transition" as ?type)
              #code
              OPTIONAL {
                ${uri} core:has_code ?code.
              }
              #guard
              OPTIONAL {
                ${uri} core:has_guard ?guard.
                ?guard core:has_value ?_guard_value.
              }
              BIND (if(!BOUND(?_guard_value), "true", ?_guard_value) as ?guard_value)
            }
            UNION
            {
              #input arcs
              ?arc_i core:has_targetNode ${uri}.
              {
                BIND("arcs" as ?type)
                ?arc_i core:has_sourceNode ?place_i.
              }
              UNION
              {
                BIND("arcs_data" as ?type)
                OPTIONAL {
                  ?arc_i core:has_annotation ?arc_i_annotation.
                  ?arc_i_annotation core:has_multisetOfTerms ?arcan_multiset.
                  {
                    ?arcan_multiset rdf:type core:Constant.
                    BIND (?arcan_multiset as ?arcan_constant)
                    ?arcan_constant core:has_name ?arcan_constant_name.
                  }
                  UNION
                  {
                    ?arcan_multiset core:includes_basisSet ?basisSet.
                    ?basisSet core:has_data ?term;
                              core:has_multiplicity ?multiplicity.
                    ?term core:has_value ?term_value.
                  }
                }
              }
            }
          }
          ORDER BY ?arc_i ?type
        `,
      },
    });
    const transitionInputDataIntermediate = response.results.bindings.reduce(
      (data: TransitionInputDataIntermediate, row) => {
        switch (row.type.value) {
          case 'transition':
            data.code = row.code?.value; // eslint-disable-line no-param-reassign
            data.guard = row.guard_value?.value ?? 'true'; // eslint-disable-line no-param-reassign
            break;
          case 'arcs':
            // eslint-disable-next-line no-param-reassign
            data.arcs[row.arc_i.value] = {
              place: row.place_i.value,
              terms: [],
            };
            break;
          case 'arcs_data':
            if (row.arcan_constant_name) {
              // eslint-disable-next-line no-param-reassign
              data.arcs[row.arc_i.value].constant =
                row.arcan_constant_name?.value;
            } else if (row.term_value) {
              data.arcs[row.arc_i.value].terms.push({
                value: row.term_value.value,
                multiplicity:
                  row.multiplicity?.value ?? (row.term_value && '1'),
              });
            }
            break;
          default:
        }
        return data;
      },
      { arcs: {} }
    );
    const transitionInputData: TransitionInputData = {
      code: transitionInputDataIntermediate.code,
      guard: transitionInputDataIntermediate.guard,
      arcs: Object.keys(transitionInputDataIntermediate.arcs).reduce(
        (data: TransitionInputData['arcs'], arcId) => {
          const arcData = transitionInputDataIntermediate.arcs[arcId];
          // eslint-disable-next-line no-param-reassign
          data[arcId] = {
            place: arcData.place,
            multiset: null,
          };
          if (arcData.constant) {
            // eslint-disable-next-line no-param-reassign
            data[arcId].multiset = <Multiset>(
              this.configuration.constants[arcData.constant]
            );
          } else {
            const { Multiset, BasisSet } = this.configuration.functions;
            // eslint-disable-next-line no-param-reassign
            data[arcId].multiset = <Multiset>new Multiset(
              arcData.terms.reduce(
                (basisSets: Record<string, BasisSet>, term, i) => {
                  // eslint-disable-next-line no-param-reassign
                  basisSets[i] = <BasisSet>(
                    new BasisSet(term.value, term.multiplicity)
                  );
                  return basisSets;
                },
                {}
              )
            );
          }
          return data;
        },
        {}
      ),
    };
    return transitionInputData;
  }
}
