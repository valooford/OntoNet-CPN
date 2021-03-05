import { EventEmitter } from 'events';
import { ReadStream } from 'fs';

import axios from 'axios';
import FormData from 'form-data';

import Reasoner, { types as reasonerTypes } from '../Reasoner';
import types from './types';

const {
  VALIDATE_ENDPOINT,
  ENDPOINT_ECHO,
  SPECIFY_ENDPOINT,
  UPLOAD_ONTOLOGY,
} = types;

class Engine {
  private readonly reasoner;

  private endpoint: string;

  constructor(readonly emitter: EventEmitter) {
    this.reasoner = new Reasoner(this.emitter);
    this.addEventListeners();
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
      console.log(`Engine: endpoint '${this.endpoint} have been specified'`);
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
        const graphURI = graphName
          ? `${this.endpoint}/data/${graphName}`
          : 'urn:x-arq:DefaultGraph';
        // clearing the default graph
        const querySP = new URLSearchParams();
        querySP.append('update', `CLEAR GRAPH <${graphURI}>`);
        await axios.post(`${this.endpoint}/update`, querySP);
        // uploading the new ontology file
        const graphEndpoint = `${this.endpoint}/data${
          graphName ? `?graph=${graphName}` : ''
        }`;
        const ontologyFD = new FormData();
        ontologyFD.append('graph', ontologyRS);
        axios.post(`${graphEndpoint}/data`, ontologyFD, {
          headers: ontologyFD.getHeaders(),
        });
      }
    );
  }
}

export default Engine;

const combinedTypes = { ...reasonerTypes, ...types };
export { combinedTypes as types };
