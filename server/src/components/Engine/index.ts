import { EventEmitter } from 'events';
import { ReadStream } from 'fs';

import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';

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

  private async startInitialReasoning(): Promise<void> {
    // ... steps of reasoning with Reasoner's methods calls
    const initialState = await this.sendSelectRequest(
      queries['reasoning-select']()
    );
    Object.values(initialState.data.results.bindings).forEach(
      ({ type, id, ...payload }) => {
        this.netStructure[type.value][id.value] = Object.keys(payload).reduce(
          (pl, key) => {
            pl[key] = payload[key].value;
            return pl;
          },
          {}
        );
      }
    );
    // console.log(this.netStructure);
    const placeTerms = Object.values(this.netStructure.places).reduce(
      (terms, { init_tokens_term, init_tokens }) => {
        terms[init_tokens_term] = init_tokens;
        return terms;
      },
      {}
    );
    const processedTerms = this.reasoner.processTerms(placeTerms);
  }
}

export default Engine;

const combinedTypes = { ...reasonerTypes, ...types };
export { combinedTypes as types };
