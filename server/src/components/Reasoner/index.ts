import { EventEmitter } from 'events';

import types from './types';

const { CONFIGURE_ENVIRONMENT } = types;

class Reasoner {
  private formulas = {};

  constructor(readonly emitter: EventEmitter) {
    this.addEventListeners();
  }

  private addEventListeners(): void {
    // configuration request
    this.emitter.on(CONFIGURE_ENVIRONMENT, ({ formulas }) => {
      this.formulas = formulas;
      console.log('Reasoner: new configuration: ', this.formulas);
    });
  }
}

export default Reasoner;
export { types };
