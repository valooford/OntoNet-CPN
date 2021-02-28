import { EventEmitter } from 'events';

import CLI, {types as cliTypes} from '../CLI';
import WebServer from '../WebServer';
import Engine from '../Engine';

class Core {
  private readonly cliEmitter = new EventEmitter();
  private readonly cli = new CLI(this.cliEmitter);

  private readonly webServer = new WebServer();

  private readonly engine = new Engine();

  constructor() {
    this.addCliEventListeners();
    setTimeout(() => {
      this.cli.run();
    }, 2000);
  }

  private addCliEventListeners():void {
    this.cliEmitter.on(cliTypes.VALIDATE_ENDPOINT, (/* { endpoint } */) => {
      this.cliEmitter.emit(cliTypes.ENDPOINT_VALIDATED)
    })
    this.cliEmitter.on(cliTypes.ENDPOINT_SPECIFIED, ({endpoint}) => {
      console.log(`Core: endpoint '${endpoint} have been specified'`)
    }) 
  }
}

export default Core;
