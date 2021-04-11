import { EventEmitter } from 'events';
import { ReadStream } from 'fs';

import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import isEqual from 'lodash/isEqual';

import { hashStr } from '../../utils';
import Reasoner, { types as reasonerTypes } from '../Reasoner';
import types from './types';
import queries from './queries';
import * as interfaces from './interfaces';

const {
  VALIDATE_ENDPOINT,
  ENDPOINT_ECHO,
  SPECIFY_ENDPOINT,
  UPLOAD_ONTOLOGY,
  FORWARD_SPARQL_REQUEST,
} = types;

class Engine {
  private readonly reasoner: Reasoner;

  private endpoint: string;

  private readonly netStructure: interfaces.NetStructure = {
    transitions: {},
    arcs: {},
    places: {},
  };

  constructor(private readonly emitter: EventEmitter) {
    this.reasoner = new Reasoner(this.emitter);
    this.addEventListeners();
  }

  private async sendSelectRequest(
    query: string
  ): Promise<AxiosResponse<interfaces.initialStateResponse>> {
    const querySP = new URLSearchParams();
    querySP.append('query', query);
    return axios.post(`${this.endpoint}/sparql`, querySP);
  }

  private async sendUpdateRequest(query: string): Promise<AxiosResponse> {
    const querySP = new URLSearchParams();
    querySP.append('update', query);
    return axios.post(`${this.endpoint}/update`, querySP);
  }

  private addEventListeners(): void {
    // validation request
    this.emitter.on(VALIDATE_ENDPOINT, async ({ endpoint }) => {
      try {
        await axios.get(endpoint, {
          timeout: 10000,
        });
      } catch {}
      this.emitter.emit(ENDPOINT_ECHO, {});
    });
    // endpoint specification request
    this.emitter.on(SPECIFY_ENDPOINT, ({ endpoint }) => {
      if (endpoint === this.endpoint) return;
      this.endpoint = endpoint;
      // console.log(`Engine: endpoint '${this.endpoint} have been specified'`);
      this.startInitialReasoning();
    });
    // ontology upload request
    this.emitter.on(
      UPLOAD_ONTOLOGY,
      async ({
        ontologyRS,
        graphName,
      }: {
        ontologyRS: ReadStream;
        graphName?: string;
      }) => {
        // clearing the default graph
        const graphURI = graphName
          ? `${this.endpoint}/data/${graphName}`
          : 'urn:x-arq:DefaultGraph';
        await this.sendUpdateRequest(`CLEAR GRAPH <${graphURI}>`);
        // uploading the new ontology file
        const graphEndpoint = `${this.endpoint}/data${
          graphName ? `?graph=${graphName}` : ''
        }`;
        const ontologyFD = new FormData();
        ontologyFD.append('graph', ontologyRS);
        await axios.post(`${graphEndpoint}`, ontologyFD, {
          headers: ontologyFD.getHeaders(),
        });
        this.startInitialReasoning();
      }
    );
    // sparql request forwarding
    this.emitter.on(
      FORWARD_SPARQL_REQUEST,
      async ({
        body,
        callback,
      }: {
        body: string;
        callback(res: interfaces.selectionResponse): void;
      }) => {
        const response = await this.sendSelectRequest(body);
        // console.log(response.data);
        callback(response.data);
        // this.startReasoning();
      }
    );
  }

  private static getPayloadFromRaw(payloadRaw): Record<string, string> {
    return Object.keys(payloadRaw).reduce((pl, key) => {
      pl[key] = payloadRaw[key].value;
      return pl;
    }, {});
  }

  private async startInitialReasoning(): Promise<void> {
    // Receiving the initial state
    const initialState = await this.sendSelectRequest(
      queries['reasoning-select']()
    );
    Object.values(initialState.data.results.bindings).forEach(
      ({ type, id, ...payloadRaw }) => {
        const payload = Engine.getPayloadFromRaw(payloadRaw);
        switch (type.value) {
          case 'transitions':
            {
              const { transitions } = this.netStructure;

              if (payloadRaw['arc']) {
                // transition input&output arcs and places
                const { arc, arc_type, place } = payload;
                const dst =
                  arc_type === 'input'
                    ? transitions[id.value].inputs
                    : transitions[id.value].outputs;
                dst.push({ arc, place });
              } else {
                // transition guard, [code]
                transitions[id.value] = {
                  inputs: transitions[id.value]?.inputs || [],
                  outputs: transitions[id.value]?.outputs || [],
                  ...(<{ guard: string; code?: string }>payload),
                };
              }
            }
            break;
          case 'places':
            {
              const { places } = this.netStructure;
              if (payloadRaw['value']) {
                places[id.value] = { value: JSON.parse(payload.value) };
              } else {
                places[id.value] = { ...payload };
              }
            }
            break;
          case 'arcs':
            {
              const { arcs } = this.netStructure;
              if (payloadRaw['value']) {
                arcs[id.value] = { value: JSON.parse(payload.value) };
              } else {
                arcs[id.value] = { ...payload };
              }
            }
            break;
        }
      }
    );

    // Calculating terms
    const getTerms = (
      entity: Record<string, { term?: string; term_value?: string }>
    ) =>
      Object.values(entity).reduce((terms, el) => {
        const { term, term_value } = el;
        if (term) {
          terms[term] = term_value;
        }
        return terms;
      }, {});
    const placesTerms = getTerms(this.netStructure.places);
    const placesTermsValues = this.reasoner.processTerms(
      <Record<string, string>>placesTerms
    );
    const arcsTerms = getTerms(this.netStructure.arcs);
    const arcsTermsValues = this.reasoner.processTerms(
      <Record<string, string>>arcsTerms
    );
    const saveTermValues = (
      dst: Record<string, { term?: string; value?: unknown }>,
      values: Record<string, unknown>
    ) => {
      Object.values(dst).forEach((el) => {
        const { term } = el;
        if (term) {
          el.value = values[term];
        }
      });
    };
    saveTermValues(this.netStructure.places, placesTermsValues);
    saveTermValues(this.netStructure.arcs, arcsTermsValues);
    // console.log(
    await this.sendUpdateRequest(
      queries['insert-calculated-multiset-terms']({
        aboxEndpointURL: `${this.endpoint}/data/abox`,
        tboxEndpointURL: `${this.endpoint}/data/tbox`,
        calculatedTerms: { ...placesTermsValues, ...arcsTermsValues },
      })
    );

    // Getting annotation basisSets of every arc
    const arcsAnnotationsResponse = await this.sendSelectRequest(
      queries['get-arcs-annotations']()
    );
    Object.values(this.netStructure.arcs).forEach((arc) => {
      arc.basisSets = {};
    });
    Object.values(arcsAnnotationsResponse.data.results.bindings).forEach(
      (payloadRaw) => {
        const { id, basis_set, value, multiplicity } = Engine.getPayloadFromRaw(
          payloadRaw
        );
        this.netStructure.arcs[id].basisSets[basis_set] = {
          value: JSON.parse(value),
          multiplicity,
        };
      }
    );

    // Finding enabled transitions
    this.formTransitionModes();
    // ...
  }

  private async formTransitionModes(): Promise<unknown> {
    const marking = await this.getCurrentMarking();
    // console.log('MARKING');
    // Object.keys(marking).forEach((id) => {
    //   console.log(`${id} multisets: `, marking[id]);
    // });

    const annotations = Object.keys(this.netStructure.arcs).reduce(
      (anno, id) => {
        anno[id] = this.netStructure.arcs[id].basisSets;
        return anno;
      },
      {}
    );
    // console.log('ANNOTATIONS');
    // Object.keys(annotations).forEach((id) => {
    //   console.log(`${id} annotation: `, annotations[id]);
    // });

    const inputs = Object.keys(this.netStructure.transitions).reduce(
      (inp, id) => {
        inp[id] = this.netStructure.transitions[id].inputs.reduce(
          (trInp, { arc, place }) => {
            trInp[arc] = place;
            return trInp;
          },
          {}
        );
        return inp;
      },
      {}
    );

    const isolatedBindings = this.getIsolatedBindings(
      inputs,
      annotations,
      marking
    );
    // console.log(isolatedBindings);

    const isolatedBindingsList = <interfaces.isolatedBindingsListType>(
      Object.values(isolatedBindings).reduce(
        (transitionsIbList, transitionIb) => {
          transitionsIbList.push(
            ...Object.values(transitionIb).reduce((arcsIbList, arcIb) => {
              arcsIbList.push(
                ...Object.keys(arcIb).reduce(
                  (annoChunksIbList, annoChunkUri) => {
                    const annoChunkIb = arcIb[annoChunkUri];
                    annoChunksIbList.push(
                      ...Object.keys(annoChunkIb).reduce(
                        (tokensIbList, tokenUri) => {
                          const tokensIb = annoChunkIb[tokenUri];
                          tokensIbList.push(
                            ...Object.keys(tokensIb).map((variableName) => ({
                              variableName,
                              value: JSON.stringify(tokensIb[variableName]),
                              tokenUri,
                              annoChunkUri,
                            }))
                          );
                          return tokensIbList;
                        },
                        []
                      )
                    );
                    return annoChunksIbList;
                  },
                  []
                )
              );
              return arcsIbList;
            }, [])
          );
          return transitionsIbList;
        },
        []
      )
    );
    // console.log('isolatedBindingsList', isolatedBindingsList);
    await this.sendUpdateRequest(
      queries['set-raw-bindings'](isolatedBindingsList)
    );

    const leafBindingsResponse = await this.sendSelectRequest(
      queries['get-leaf-bindings']()
    );
    const leafBindings = leafBindingsResponse.data.results.bindings
      .map((b) => b.id.value)
      .reduce((lb, b) => {
        lb[hashStr(b)] = b;
        return lb;
      }, {});

    const bindingsCombitationsResponse = await this.sendSelectRequest(
      queries['get-leaf-bindings-combinations'](leafBindings)
    );
    // const bindingsCombitations = bindingsCombitationsResponse.data.results.bindings.map(
    //   Engine.getPayloadFromRaw
    // );
    // console.log('bindingsCombitations: ', bindingsCombitations);
    const transitionModes = bindingsCombitationsResponse.data.results.bindings.reduce(
      (tms, b) => {
        const tmId = b['transition_mode'].value;
        const value = b['binding'].value;
        if (!tms[tmId]) {
          tms[tmId] = [];
        }
        tms[tmId].push(value);
        return tms;
      },
      {}
    );
    // console.log('transitionModes: ', transitionModes);
    console.log('transitionModes size: ', Object.keys(transitionModes).length);

    // ...send reasoning SPARQL request

    // const { transitions, arcs, places } = this.netStructure;
    // or
    // getting basisSets for places and arcs directly from ontology
    // const basisSets = await this.sendSelectRequest(queries['basis-sets-select']());
    // console.log(basisSets);

    // return Object.keys(transitions).reduce((tm, id) => {
    //   // object of transitions bindings {}
    //   const { inputs, guard } = transitions[id];
    //   tm[id] = inputs.reduce((trTm, { arc, place }) => {
    //     // array of bindings []
    //     const pattern = arcs[arc].value;
    //     const tokens = places[place].value;
    //     const bindings = this.getBindings(pattern, tokens);
    //     if (bindings) {
    //       trTm.push(...bindings);
    //     }
    //     return trTm;
    //   }, []);
    //   return tm;
    // }, {});
    return;
  }

  private async getCurrentMarking() {
    const markingResponse = await this.sendSelectRequest(
      queries['get-marking']()
    );
    const placeMarkings = Object.keys(this.netStructure.places).reduce(
      (pm, id) => {
        pm[id] = {};
        return pm;
      },
      {}
    );
    return Object.values(markingResponse.data.results.bindings).reduce(
      (pm, payloadRaw) => {
        const { id, basis_set, value, multiplicity } = Engine.getPayloadFromRaw(
          payloadRaw
        );
        pm[id][basis_set] = {
          value: JSON.parse(value),
          multiplicity,
        };
        return pm;
      },
      placeMarkings
    );
  }

  private getIsolatedBindings(
    inputs,
    annotations,
    marking
  ): interfaces.isolatedBindings {
    return Object.keys(inputs).reduce((ib, id) => {
      // for every transition
      const [hasBindings, bindings] = Object.keys(inputs[id]).reduce(
        ([hasIb, arcIb], arcId) => {
          // for every input arc
          if (!hasIb) {
            return [false];
          }
          const placeId = inputs[id][arcId];
          const arcAnnotations = annotations[arcId];
          const placeMarking = marking[placeId];
          const [hasArcBindings, arcBindings] = Object.keys(
            arcAnnotations
          ).reduce(
            ([hasArcB, arcB], annotationChunkBs) => {
              // for every chunk of input arc annotation
              if (!hasArcB) {
                return [false];
              }
              const [isBindingsFound, chunkBindings] = Object.keys(
                placeMarking
              ).reduce(
                ([hasApplicableTokens, arcBsBindings], markingBs) => {
                  // for every token in the marking
                  const [isApplicable, tokenBindings] = this.findBindings(
                    arcAnnotations[annotationChunkBs].value,
                    placeMarking[markingBs].value
                  );
                  if (isApplicable) {
                    arcBsBindings[markingBs] = tokenBindings;
                    return [true, arcBsBindings];
                  }
                  return [hasApplicableTokens, arcBsBindings];
                },
                [false, {}]
              );
              if (!isBindingsFound) {
                return [false];
              }
              // console.log('chunk bindings', bindings);
              arcB[annotationChunkBs] = chunkBindings;

              return [true, arcB];
            },
            [true, {}]
          );
          if (!hasArcBindings) {
            return [false];
          }
          arcIb[arcId] = arcBindings;
          return [true, arcIb];
        },
        [true, {}]
      );
      if (hasBindings) {
        ib[id] = bindings;
      }
      return ib;
    }, {});
  }

  private findBindings(
    annotationChunk,
    token
  ): [true, Record<string, unknown>] | [false] {
    // console.log('pair:', annotationChunk, token);
    return Object.keys(annotationChunk).reduce(
      ([isApplicable, bindings], roleKey) => {
        if (!isApplicable) return [false];
        // annotation keys traversal
        // console.log('roleKey', roleKey);
        let key;
        let testResult;

        // role: variable
        testResult = /^(.*)\/var$/.exec(roleKey);
        if (testResult) {
          [, key] = testResult;
          const varName = annotationChunk[roleKey];
          if (key) {
            // ::<key>/var
            if (typeof token[key] === 'undefined') {
              return [false];
            }
            bindings[varName] = token[key];
            // console.log(`partial mapping of ${key} to the ${varName} variable`);
          } else {
            // ::/var
            bindings[varName] = token;
            // console.log(`complete mapping to the ${varName} variable`);
          }
          return [true, bindings];
        }

        // role: rest
        testResult = /^(.+)\/rest$/.exec(roleKey);
        if (testResult) {
          // ::<key>/rest
          [, key] = testResult;
          const varName = annotationChunk[roleKey];
          if (Array.isArray(token)) {
            // token is an array
            if (Number.isNaN(Number(key))) {
              return [false];
            }
            bindings[varName] = (<Array<unknown>>token).slice(key);
          } else {
            // token as a regular object
            const tokenKeys = Object.keys(token);
            const keyIndex = tokenKeys.indexOf(key);
            if (~keyIndex) {
              // ~ for -1 gives 0 -> token has no such key
              return [false];
            }
            bindings[varName] = tokenKeys
              .slice(keyIndex)
              .reduce((rest, tokenKey) => {
                rest[tokenKey] = token[tokenKey];
                return rest;
              }, {});
          }
          // console.log(`partial mapping from ${key} to the ${varName} variable`);
          return [true, bindings];
        }

        // role: expr
        testResult = /^(.*)\/expr$/.exec(roleKey);
        if (testResult) {
          [, key] = testResult;
          const expression = annotationChunk[roleKey];
          const expressionValue = this.reasoner.processTermInEnvironment(
            expression
          );
          if (key && typeof token[key] === 'undefined') {
            return [false];
          }
          if (typeof expressionValue === 'object') {
            // sub annotation
            const [isSubApplicable, subBindings] = this.findBindings(
              expressionValue,
              key ? token[key] : token
            );
            if (!isSubApplicable) {
              return [false];
            }
            bindings = { ...bindings, ...subBindings };
          } else {
            // just a simple value
            const tokenValue = key ? token[key] : token;
            if (tokenValue !== expressionValue) {
              return [false];
            }
          }
          // ::<key>/expr
          // console.log(
          //   `partial mapping of ${key} using '${expression}' expression`
          // );
          // ::/expr
          // console.log(`complete mapping using '${expression}' expression`);
          return [true, bindings];
        }

        // role: val
        testResult = /^\/val$/.exec(roleKey);
        if (testResult) {
          [, key] = testResult;
          const expression = annotationChunk[roleKey];
          const expressionValue = this.reasoner.processTermInEnvironment(
            expression
          );
          if (key && typeof token[key] === 'undefined') {
            return [false];
          }
          const tokenValue = key ? token[key] : token;
          if (!isEqual(tokenValue, expressionValue)) {
            return [false];
          }
          // console.log(`comparation with '${expression}'`);
          return [true, bindings];
        }

        // role: regular
        key = roleKey;
        const annotationValue = annotationChunk[key];
        if (typeof token[key] === 'undefined') {
          return [false];
        }
        if (typeof annotationValue === 'object') {
          // sub annotation
          const [isSubApplicable, subBindings] = this.findBindings(
            annotationValue,
            token[key]
          );
          if (!isSubApplicable) {
            return [false];
          }
          bindings = { ...bindings, ...subBindings };
        } else {
          // just a simple value
          const tokenValue = key ? token[key] : token;
          if (tokenValue !== annotationValue) {
            return [false];
          }
        }
        // console.log(`comparation using '${subAnnotation}' annotation`);
        return [true, bindings];
      },
      [true, {}]
    );
  }

  // private getBindings(pattern, tokens): Array<Record<string, unknown>> {
  //   const detachedBindings = pattern.basisSets.reduce(
  //     (db, { data, multiplicity }) => {
  //       // detachedBindings {}
  //       Object.keys(data);
  //       return db;
  //     }
  //   );
  //   return null;
  // }
}

export default Engine;

const combinedTypes = { ...reasonerTypes, ...types };
export { combinedTypes as types };
