import { EventEmitter } from 'events';

import types from './types';
import * as interfaces from './interfaces';

const { CONFIGURE_ENVIRONMENT } = types;

class Reasoner {
  private formulas = {};

  constructor(private readonly emitter: EventEmitter) {
    this.addEventListeners();
  }

  private addEventListeners(): void {
    // configuration request
    this.emitter.on(CONFIGURE_ENVIRONMENT, ({ formulas }) => {
      this.formulas = formulas;
      // console.log('Reasoner: new configuration: ', this.formulas);
    });
  }

  processTerms(terms: interfaces.Terms): interfaces.ProcessedTerms {
    return terms;
  }
}

export default Reasoner;
export { types };
