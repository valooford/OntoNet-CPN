import { EventEmitter } from 'events';
import { ReadStream } from 'fs';
import p from 'path';

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
    }, 200);
  }

  private addCliEventListeners(): void {
    this.cliEmitter.on(cliTypes.VALIDATE_ENDPOINT, (/* { endpoint } */) => {
      this.cliEmitter.emit(cliTypes.ENDPOINT_VALIDATED);
    });
    this.cliEmitter.on(cliTypes.ENDPOINT_SPECIFIED, ({ endpoint }) => {
      console.log(`Core: endpoint '${endpoint} have been specified'`);
    });
    this.cliEmitter.on(
      cliTypes.UPLOAD_ONTOLOGY,
      ({ fileRS }: { [fileRS: string]: ReadStream }) => {
        console.log(`Ontology file path: ${fileRS.path}`);
        fileRS.once('readable', () => {
          console.log(`Ontology file contents: ${fileRS.read(10)}...`);
        });
      }
    );
    this.cliEmitter.on(
      cliTypes.CONFIGURE_WITH_DESCRIPTOR,
      ({ fileRS }: { [fileRS: string]: ReadStream }) => {
        const path = <string>fileRS.path;
        if (p.extname(path) === '.js') {
          import(path).then((formulas) => {
            console.log(formulas);
          });
        }
      }
    );
  }
}

export default Core;
