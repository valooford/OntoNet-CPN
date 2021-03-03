import { EventEmitter } from 'events';

import axios from 'axios';

import Reasoner, { types as reasonerTypes } from '../Reasoner';
import types from './types';

const { VALIDATE_ENDPOINT, ENDPOINT_ECHO, SPECIFY_ENDPOINT } = types;

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
      await axios.get(endpoint, {
        timeout: 10000,
      });
      this.emitter.emit(ENDPOINT_ECHO, {});
    });
    // endpoint specify request
    this.emitter.on(SPECIFY_ENDPOINT, ({ endpoint }) => {
      this.endpoint = endpoint;
      console.log(`Engine: endpoint '${this.endpoint} have been specified'`);
    });
  }
}

export default Engine;

const combinedTypes = { ...reasonerTypes, ...types };
export { combinedTypes as types };
