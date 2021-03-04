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
      async ({ ontologyRS }: { ['ontologyRS']: ReadStream }) => {
        // clearing the default graph
        // const queryFD = new FormData();
        // queryFD.append('update', `CLEAR GRAPH <${this.endpoint}/data/default>`);
        // await axios.post(`${this.endpoint}/update`, queryFD, {
        //   headers: {
        //     ...queryFD.getHeaders(),
        //     // 'content-type': 'application/sparql-update',
        //     'content-type': 'application/x-www-form-urlencoded',
        //   },
        // });
        // uploading the new ontology file
        const ontologyFD = new FormData();
        ontologyFD.append('graph', ontologyRS);
        axios.post(`${this.endpoint}/data`, ontologyFD, {
          headers: ontologyFD.getHeaders(),
        });
      }
    );
  }
}

export default Engine;

const combinedTypes = { ...reasonerTypes, ...types };
export { combinedTypes as types };
