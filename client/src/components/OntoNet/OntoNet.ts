import $ from "jquery";

import {
  StateVariables as _StateVariables,
  StateResponse as _StateResponse,
  TransitionResponse,
  VarValuesResponse,
  EnabledTransitionData as _EnabledTransitionData,
} from "./types";

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

  constructor(params: Parameters = undefined) {
    this.dataset = params?.dataset;
    this.hostname = params?.hostname ?? "localhost";
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

  uploadCpnOntology(file: File): Promise<void> {
    const formData: FormData = new FormData();
    formData.append("graph", file);
    return Promise.resolve(
      $.post({
        url: `http://${this.hostname}:${this.port}/${this.dataset}/update`,
        data: {
          update: "DELETE {?s ?p ?o.} WHERE {?s ?p ?o.}",
        },
      }).then(async () => {
        await $.post({
          url: `http://${this.hostname}:${this.port}/${this.dataset}/upload`,
          data: formData,
          processData: false,
          contentType: false,
          complete(res, status) {
            if (status === "success") {
              console.log("CPN Ontology was uploaded");
            } else {
              console.log("Error while uploading CPN Ontology");
            }
          },
        });
      })
    );
  }

  getCpnState(): Promise<StateResponse> {
    return Promise.resolve(
      $.post({
        url: `http://${this.hostname}:${this.port}/${this.dataset}/sparql`,
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
      }).then(
        (res: StateResponse): StateResponse => {
          return res;
        }
      )
    );
  }

  private static getIdFromURI(uri: string): string {
    const i = uri.indexOf("#");
    return uri.slice(i + 1);
  }

  getEnabledTransitionsData(): Promise<EnabledTransitionData[]> {
    return Promise.resolve(
      $.post({
        url: `http://${this.hostname}:${this.port}/${this.dataset}/sparql`,
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
            const variables = b.variables.value.split(",");
            const condition = b.condition_data.value;
            return $.post({
              url: `http://${this.hostname}:${this.port}/${this.dataset}/sparql`,
              data: {
                query: `
                  PREFIX : <http://www.semanticweb.org/baker/ontologies/2020/9/OntoNet-CPN-onlotogy#>
                  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

                  SELECT ?place_i ?token_i ?values ${variables
                    .map((v) => `?${v}`)
                    .join(" ")}
                  WHERE {
                    ### finding appropriate variable values combination to match the condition
                    ${variables.reduce(
                      (vars, v: string) => `${vars}
                      ${`
                        {
                          SELECT DISTINCT ?${v}
                          WHERE {
                            ?arc_i :comes_to :${t};														# <-- :t1
                                  :comes_from ?place_i;
                                  :has_pattern ?patt_i.
                            ?place_i :has_marking ?marking_i.
                            ?marking_i :has_token ?token_i.	
                            ?token_i :has_attribute ?attr_i.
                            ?attr_i :has_data ?${v};
                                    :has_index ?attr_i_index.
                            ?patt_i :has_variable ?var_i.
                            ?var_i :has_name ?var_i_name;
                                  :has_index ?var_i_index.
                            FILTER(?var_i_name = "${v}" && ?attr_i_index = ?var_i_index)					# <-- "x"
                          }
                        }
                      `}`,
                      ""
                    )}
                    
                    # binding a condition match
                    BIND((${condition}) as ?res)
                  #  BIND((true) as ?res)
                    
                    ### finding appropriate tokens to pass through transition
                    ?arc_i :comes_to :${t};														# <-- :t1
                          :comes_from ?place_i;
                          :has_pattern ?patt_i.
                    
                    ?place_i :has_marking ?marking_i.
                    ?marking_i :has_token ?token_i.	
                    
                    {
                      SELECT ?token_i ?patt_i ${variables
                        .map((v) => `?${v}`)
                        .join(" ")}											# <-- ?x ?y
                      WHERE {
                        ${variables.reduce(
                          (vars, v) => `${vars}
                          # select ?${v}
                          OPTIONAL {
                            SELECT ?token_i ?patt_i ?${v}
                            WHERE {
                              ?token_i :has_attribute ?attr_i.
                              ?attr_i :has_data ?${v};
                                      :has_index ?attr_i_index.
                              ?patt_i :has_variable ?var_i.
                              ?var_i :has_name ?var_i_name;
                                    :has_index ?var_i_index.
                              FILTER(?var_i_name = "${v}" && ?attr_i_index = ?var_i_index)			# <-- "x"
                            }
                          }
                        `,
                          ""
                        )}
                      }
                    }
                    
                    ${variables.reduce(
                      (vars, v) => `${vars}
                      # filter ?${v} (checking for '?${v}' value existing in every position)
                      FILTER (!BOUND(?${v}) || NOT EXISTS {
                        SELECT ?place2_i ?${v} (COUNT(?attr2_i_data) as ?${v}2_count)
                        WHERE {
                          ?arc2_i :comes_to :${t};												# <-- :t1
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
                      ""
                    )}
                    
                    ### binding a variable values set
                    BIND((${variables
                      .map((v) => `?${v}`)
                      .join(` + ", " + `)}) as ?values)
                  }
                  GROUP BY ?place_i ?token_i ?res ?values ${variables
                    .map((v) => `?${v}`)
                    .join(" ")}
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

  performTransition(t: string, values: string): Promise<void> {
    // ! Array.prototype.find() requires polyfill
    const td = this.enabledTransitionsData.find((etd) => etd.id === t);
    const { variables } = td;
    const varValues = values.split(", ");
    const places = td.groups[values];
    const tokens = Object.values(places).map((tokens) => tokens[0]);
    return Promise.resolve(
      $.post({
        url: `http://${this.hostname}:${this.port}/${this.dataset}/update`,
        data: {
          update: `
          PREFIX : <http://www.semanticweb.org/baker/ontologies/2020/9/OntoNet-CPN-onlotogy#>
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          
          DELETE {
            ?marking_i :has_token ?token_i.
            ?token_i rdf:type :Token;
                    :has_attribute ?token_i_attr.
            ?token_i_attr rdf:type :Attribute;
                          :has_data ?token_i_attr_data;
                          :has_index ?token_i_attr_index.
          }
          INSERT {
            ?marking_o :has_token ?token_new.
            ?token_new rdf:type :Token;
                      ${variables
                        .map((v) => `:has_attribute ?${v}`)
                        .join(";\n")}.
            ${variables
              .map(
                (v, i) => `
            ?${v} rdf:type :Attribute;
                  :has_data "${varValues[i]}";
                  :has_index ?${v}_index.
            `
              )
              .join("")}
          }
          WHERE {
            {
              VALUES ?token_i { ${tokens
                .map((t) => `:${t}`)
                .join(" ")} }				# <-- :token1-1 :token2-1
          
              ?arc_i :comes_to :${t};								# <-- :t1
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
              ?arc_o :comes_from :${t};								# <-- :t1
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
                ""
              )}
            }
          }
        `,
        },
      })
    );
  }
}
