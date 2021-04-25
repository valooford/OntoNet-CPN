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

  public processTermInEnvironment(term: string, extendedEnv = {}): unknown {
    return new Function(
      'env',
      `
        with(env) {
          return ${term};
        }
      `
    )({ ...extendedEnv, ...this.formulas });
  }

  processTerms(terms: interfaces.Terms): interfaces.ProcessedTerms {
    return Object.keys(terms).reduce((processedTerms, id) => {
      processedTerms[id] = this.processTermInEnvironment(terms[id]);
      return processedTerms;
    }, {});
  }
}

export default Reasoner;
export { types };
