import $ from 'jquery';

import {
  ConfigurationResponse,
  Configuration,
  StateVariables as _StateVariables,
  StateResponse as _StateResponse,
  TransitionResponse,
  VarValuesResponse,
  EnabledTransitionData as _EnabledTransitionData,
} from './types';

export type StateVariables = _StateVariables;
export type StateResponse = _StateResponse;
export type EnabledTransitionData = _EnabledTransitionData;

type Parameters =
  | {
      dataset: string;
      hostname?: string;
      port?: number;
    }
  | undefined;

export default class OntoNet {
  protected hostname: string;

  protected port: number;

  protected dataset: string;

  protected enabledTransitionsData: EnabledTransitionData[] = [];

  private configuration: Configuration;

  constructor(params: Parameters = undefined) {
    this.dataset = params?.dataset;
    this.hostname = params?.hostname ?? 'localhost';
    this.port = params?.port ?? 3030;
  }

  setHostname(hostname: string): void {
    this.hostname = hostname;
  }

  setPort(port: number): void {
    this.port = port;
  }

  setDataset(dataset: string): void {
    this.dataset = dataset;
  }

  private getUrl() {
    return `http://${this.hostname}:${this.port}/${this.dataset}`;
  }

  private readonly graphName = 'net';

  uploadCpnOntology(file: File): Promise<void> {
    const formData: FormData = new FormData();
    formData.append('graph', file);
    return Promise.resolve(
      $.post({
        url: `${this.getUrl()}/update`,
        data: {
          update: `CLEAR GRAPH <${this.getUrl()}/data/${this.graphName}>`,
        },
      }).then(async () => {
        const uploadPromise = await $.post({
          url: `${this.getUrl()}/data?graph=${this.graphName}`,
          data: formData,
          processData: false,
          contentType: false,
          complete(res, status) {
            if (status === 'success') {
              console.log('ontonet: CPN Ontology was uploaded');
            } else {
              console.log('ontonet: Error while uploading CPN Ontology');
            }
          },
        });
        this.getConfiguration();
        return uploadPromise;
      })
    );
  }

  async getConfiguration(): Promise<void> {
    const response: ConfigurationResponse = await $.post({
      url: `${this.getUrl()}/sparql`,
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
          FROM <http://localhost:3030/ontonet/data/net>
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
              new Function(...argumentsList, action);
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

  getCpnState(): Promise<StateResponse> {
    return Promise.resolve(
      $.post({
        url: `${this.getUrl()}/sparql`,
        data: {
          query: `
            PREFIX m: <http://www.semanticweb.org/baker/ontologies/2020/9/OntoNet-CPN-onlotogy#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

            SELECT ?place ?token (GROUP_CONCAT(?data;SEPARATOR=",") AS ?token_data)
            WHERE {
              ?place rdf:type m:Place.
              ?place m:has_marking ?marking.
              ?marking m:has_token ?token.
              OPTIONAL {
              ?token m:has_attribute ?attr.
                {
                  SELECT ?attr ?data
                  WHERE {
                    ?attr m:has_data ?data.
                    ?attr m:has_index ?index.
                  }
                  ORDER BY ?index
                }
              }
            }
            GROUP BY ?place ?token
            ORDER BY ?place
          `,
        },
        error() {
          console.log('ontonet: Unable to get the CPN state');
        },
      }).then(
        (res: StateResponse): StateResponse => {
          return res;
        }
      )
    );
  }

  private static getIdFromURI(uri: string): string {
    if (/^urn:uuid:.*/.test(uri)) return `<${uri}>`;
    const i = uri.indexOf('#');
    return `:${uri.slice(i + 1)}`;
  }

  getEnabledTransitionsData(): Promise<EnabledTransitionData[]> {
    return Promise.resolve(
      $.post({
        url: `${this.getUrl()}/sparql`,
        data: {
          query: `
            PREFIX m: <http://www.semanticweb.org/baker/ontologies/2020/9/OntoNet-CPN-onlotogy#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

            SELECT ?transition ?condition_data ?variables
            WHERE {
              ?transition rdf:type m:Transition.
              
              ?transition m:has_condition ?condition.
              ?condition m:has_data ?condition_data
              
              {
                SELECT ?transition (GROUP_CONCAT(?var_i_name; SEPARATOR=",") as ?variables)
                WHERE {
                  {
                    SELECT DISTINCT ?transition ?var_i_name
                    WHERE {
                      ?arc_i m:comes_to ?transition;
                            m:has_pattern ?patt_i.
                      ?patt_i m:has_variable ?var_i.
                      ?var_i m:has_name ?var_i_name.
                    }
                  }
                }
                GROUP BY ?transition
              }
            }
            # LIMIT 25
          `,
        },
      }).then(async (tr: TransitionResponse) => {
        const enabledTransitionsData: EnabledTransitionData[] = await Promise.all(
          tr.results.bindings.map((b) => {
            const t = OntoNet.getIdFromURI(b.transition.value);
            const variables = b.variables.value.split(',');
            const condition = b.condition_data.value;
            return $.post({
              url: `${this.getUrl()}/sparql`,
              data: {
                query: `
                  PREFIX : <http://www.semanticweb.org/baker/ontologies/2020/9/OntoNet-CPN-onlotogy#>
                  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

                  SELECT ?place_i ?token_i ?values ${variables
                    .map((v) => `?${v}`)
                    .join(' ')}
                  WHERE {
                    ### finding appropriate variable values combination to match the condition
                    ${variables.reduce(
                      (vars, v: string) => `${vars}
                      ${`
                        {
                          SELECT DISTINCT ?${v} ?${v}_index
                          WHERE {
                            ?arc_i :comes_to ${t};														# <-- :t1
                                  :comes_from ?place_i;
                                  :has_pattern ?patt_i.
                            ?place_i :has_marking ?marking_i.
                            ?marking_i :has_token ?token_i.	
                            ?token_i :has_attribute ?attr_i.
                            ?attr_i :has_data ?${v};
                                    :has_index ?${v}_index.
                            ?patt_i :has_variable ?var_i.
                            ?var_i :has_name ?var_i_name;
                                  :has_index ?var_i_index.
                            FILTER(?var_i_name = "${v}" && ?${v}_index = ?var_i_index)					# <-- "x"
                          }
                        }
                      `}`,
                      ''
                    )}
                    
                    # binding a condition match
                    BIND((${condition}) as ?res)
                    
                    ### finding appropriate tokens to pass through transition
                    ?arc_i :comes_to ${t};														# <-- :t1
                          :comes_from ?place_i;
                          :has_pattern ?patt_i.
                    
                    ?place_i :has_marking ?marking_i.
                    ?marking_i :has_token ?token_i.	
                    
                    {
                      SELECT ?token_i ?patt_i 
                      (COUNT(?attr_i) as ?attr_i_count) (COUNT(?var_i) as ?var_i_count) 
                      ${variables
                        .map((v) => `?${v} ?${v}_index`)
                        .join(' ')}											# <-- ?x ?y
                      WHERE {
                        ?patt_i :has_variable ?var_i.
                        ?token_i :has_attribute ?attr_i.
                        ${variables.reduce(
                          (vars, v) => `${vars}
                          OPTIONAL {
                            SELECT ?token_i ?${v} ?${v}_index										# <-- ?x
                            WHERE {
                              ?token_i :has_attribute ?attr_i.
                              ?attr_i :has_data ?${v};
                                      :has_index ?${v}_index.										# <-- ?x
                            }
                          }
                        `,
                          ''
                        )}
                        FILTER(NOT EXISTS {
                          ?token_i :has_attribute ?attrx_i.
                          ?attrx_i :has_data ?_var;
                              :has_index ?_var_index.
                          FILTER (${variables
                            .map(
                              (v) =>
                                `(?_var != ?${v} || ?_var_index != ?${v}_index)`
                            )
                            .join(' && ')})	# <-- ?x ?y
                        })
                      }
                      GROUP BY ?token_i ?patt_i ${variables
                        .map((v) => `?${v} ?${v}_index`)
                        .join(' ')}						# <-- ?x ?y
	                    HAVING (?attr_i_count = ?var_i_count)
                    }
                    
                    ${variables.reduce(
                      (vars, v) => `${vars}
                      # filter ?${v} (checking for '?${v}' value existing in every position)
                      FILTER (!BOUND(?${v}) || NOT EXISTS {
                        SELECT ?place2_i ?${v} (COUNT(?attr2_i_data) as ?${v}2_count)
                        WHERE {
                          ?arc2_i :comes_to ${t};												# <-- :t1
                                  :comes_from ?place2_i;
                                  :has_pattern ?patt2_i.
                          ?place2_i :has_marking ?marking2_i.
                          ?marking2_i :has_token ?token2_i.
                          ?token2_i :has_attribute ?attr2_i.
                          ?attr2_i :has_index ?attr2_i_index.
                          ?patt2_i :has_variable ?var2_i.
                          ?var2_i :has_name ?var2_i_name;
                                  :has_index ?var2_i_index.
                          FILTER(?var2_i_name = "${v}" && ?attr2_i_index = ?var2_i_index)			# <-- "x"
                          OPTIONAL {
                            ?attr2_i :has_data ?attr2_i_data;
                                    FILTER(?attr2_i_data = ?${v})
                          }
                        }
                        GROUP BY ?place2_i ?${v}
                        HAVING (?${v}2_count = 0)
                      })
                    `,
                      ''
                    )}
                    
                    ### binding a variable values set
                    BIND((${variables
                      .map((v) => `?${v}`)
                      .join(` + ", " + `)}) as ?values)
                  }
                  GROUP BY ?place_i ?token_i ?res ?values ${variables
                    .map((v) => `?${v}`)
                    .join(' ')}
                  HAVING (?res = true)
                  ORDER BY ?values
                `,
              },
            }).then(
              (td: VarValuesResponse): EnabledTransitionData => {
                const { bindings } = td.results;
                if (!bindings.length) return null;
                return td.results.bindings.reduce(
                  (etd: EnabledTransitionData, b) => {
                    const values = b.values.value;
                    const place = OntoNet.getIdFromURI(b.place_i.value);
                    const tokenId = OntoNet.getIdFromURI(b.token_i.value);
                    if (!etd.groups[values]) {
                      // eslint-disable-next-line no-param-reassign
                      etd.groups[values] = {};
                    }
                    if (!etd.groups[values][place]) {
                      // eslint-disable-next-line no-param-reassign
                      etd.groups[values][place] = [];
                    }
                    etd.groups[values][place].push(tokenId);
                    return etd;
                  },
                  { id: t, variables, groups: {} }
                );
              }
            );
          })
        );
        this.enabledTransitionsData = enabledTransitionsData.filter(
          (etd) => etd != null
        );
        return this.enabledTransitionsData;
      })
    );
  }

  addTokenToPlace(place: string, data: string[]): Promise<void> {
    return Promise.resolve(
      $.post({
        url: `${this.getUrl()}/update`,
        data: {
          update: `
          PREFIX : <http://www.semanticweb.org/baker/ontologies/2020/9/OntoNet-CPN-onlotogy#>
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          
          DELETE {
            ?marking_old :has_token ?token_old.
            ?token_old rdf:type :Token;
                    :has_attribute ?token_old_attr.
#!rethought attribute uniqueness  #!rethought attribute uniqueness  #?token_old_attr rdf:type :Attribute;
            #               :has_data ?token_old_attr_data;
            #               :has_index ?token_old_attr_index.
          }
          INSERT {
            ?marking :has_token ?token_new.
            ?token_new rdf:type :Token;
                      ${data
                        .map((d, i) => `:has_attribute ?var${i}`)
                        .join(';\n')}.
            ${data.reduce(
              (vars, d, i) => `${vars}
            ?var${i} rdf:type :Attribute;
                          :has_data "${d}";
                          :has_index ${i + 1}.`,
              ''
            )}
          }
          WHERE {
            {
              ${place} :has_marking ?marking_old.
              ?marking_old :has_token ?token_old.
              ?token_old :has_attribute ?token_old_attr.
              ?token_old_attr :has_data ?token_old_attr_data;
                            :has_index ?token_old_attr_index.
            } UNION {
              ${place} :has_marking ?marking.								# <-- :p1
              BIND(UUID() as ?token_new)
              ${data.map((d, i) => `BIND(UUID() as ?var${i})`).join('\n')}
            }
          }
        `,
        },
      })
    );
  }

  performTransition(t: string, values: string): Promise<void> {
    // ! Array.prototype.find() requires polyfill
    const td = this.enabledTransitionsData.find((etd) => etd.id === t);
    const { variables } = td;
    const varValues = values.split(', ');
    const places = td.groups[values];
    const tokens = Object.values(places).map((tokens) => tokens[0]);
    console.log(tokens);
    return Promise.resolve(
      $.post({
        url: `${this.getUrl()}/update`,
        data: {
          update: `
          PREFIX : <http://www.semanticweb.org/baker/ontologies/2020/9/OntoNet-CPN-onlotogy#>
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          
          DELETE {
            ?marking_i :has_token ?token_i.
            ?token_i rdf:type :Token;
                    :has_attribute ?token_i_attr.
#!rethought attribute uniqueness  #?token_i_attr rdf:type :Attribute;
            #              :has_data ?token_i_attr_data;
            #              :has_index ?token_i_attr_index.
          }
          INSERT {
            ?marking_o :has_token ?token_new.
            ?token_new rdf:type :Token;
                      ${variables
                        .map((v) => `:has_attribute ?${v}`)
                        .join(';\n')}.
            ${variables
              .map(
                (v, i) => `
            ?${v} rdf:type :Attribute;
                  :has_data "${varValues[i]}";
                  :has_index ?${v}_index.
            `
              )
              .join('')}
          }
          WHERE {
            {
              VALUES ?token_i { ${tokens.join(' ')} }				# <-- :token1-1 :token2-1
          
              ?arc_i :comes_to ${t};								# <-- :t1
                    :comes_from ?place_i;
                    :has_pattern ?patt_i.
              ?place_i :has_marking ?marking_i.
              ?marking_i :has_token ?token_i.
              ?token_i :has_attribute ?token_i_attr.
              ?token_i_attr :has_data ?token_i_attr_data;
                            :has_index ?token_i_attr_index.
            }
            UNION
            {
              ?arc_o :comes_from ${t};								# <-- :t1
                    :comes_to ?place_o;
                    :has_pattern ?patt_o.
              ?place_o :has_marking ?marking_o.
          
              BIND(UUID() as ?token_new)
          
              ${variables.reduce(
                (vars, v) => `${vars}
                  OPTIONAL {
                    SELECT ?patt_o ?${v} ?${v}_index
                    WHERE {
                      ?patt_o :has_variable ?var_o.
                      ?var_o :has_name ?var_o_name;
                            :has_index ?${v}_index.
                      FILTER(?var_o_name = "${v}")						# <-- "x"
                      BIND(UUID() as ?${v})
                    }
                  }
                `,
                ''
              )}
            }
          }
        `,
        },
      })
    );
  }
}
