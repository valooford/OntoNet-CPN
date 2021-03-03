import { EventEmitter } from 'events';
import { ReadStream } from 'fs';
import p from 'path';

import CLI, { types as cliTypes } from '../CLI';
import WebServer from '../WebServer';
import Engine, { types as engineTypes } from '../Engine';

class Core {
  private readonly cliEmitter = new EventEmitter();
  private readonly cli = new CLI(this.cliEmitter);

  private readonly webServer = new WebServer();

  private readonly engineEmitter = new EventEmitter();
  private readonly engine = new Engine(this.engineEmitter);

  constructor() {
    this.addCliEventListeners();
    setTimeout(() => {
      this.cli.run();
    }, 200);
  }

  private addCliEventListeners(): void {
    // validation request
    this.cliEmitter.on(cliTypes.VALIDATE_ENDPOINT, ({ endpoint }) => {
      const echoEventHandler = () => {
        this.cliEmitter.emit(cliTypes.ENDPOINT_VALIDATED);
      };
      this.engineEmitter.once(engineTypes.ENDPOINT_ECHO, echoEventHandler);
      setTimeout(() => {
        this.engineEmitter.removeListener(
          engineTypes.ENDPOINT_ECHO,
          echoEventHandler
        );
      }, 10000);
      this.engineEmitter.emit(engineTypes.VALIDATE_ENDPOINT, { endpoint });
    });
    // endpoint was specified
    this.cliEmitter.on(cliTypes.ENDPOINT_SPECIFIED, ({ endpoint }) => {
      this.engineEmitter.emit(engineTypes.SPECIFY_ENDPOINT, { endpoint });
    });
    // ontology file have been uploaded
    this.cliEmitter.on(
      cliTypes.UPLOAD_ONTOLOGY,
      ({ fileRS }: { [fileRS: string]: ReadStream }) => {
        console.log(`Ontology file path: ${fileRS.path}`);
        fileRS.once('readable', () => {
          console.log(`Ontology file contents: ${fileRS.read(10)}...`);
        });
      }
    );
    // descriptor file have been uploaded
    this.cliEmitter.on(
      cliTypes.CONFIGURE_WITH_DESCRIPTOR,
      ({ fileRS }: { [fileRS: string]: ReadStream }) => {
        const path = <string>fileRS.path;
        if (p.extname(path) === '.js') {
          import(path).then((formulas) => {
            this.engineEmitter.emit(engineTypes.CONFIGURE_ENVIRONMENT, {
              formulas,
            });
          });
        }
      }
    );
  }

  private addEngineEventListeners(): void {
    // ...
  }
}

export default Core;
