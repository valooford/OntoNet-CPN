import { EventEmitter } from 'events';
import { ReadStream } from 'fs';
import p from 'path';

import CLI, { types as cliTypes } from '../CLI';
import WebServer, { types as webServerTypes } from '../WebServer';
import Engine, { types as engineTypes } from '../Engine';

class Core {
  private readonly cliEmitter = new EventEmitter();
  private readonly cli = new CLI(this.cliEmitter);

  private readonly webServerEmitter = new EventEmitter();
  private readonly webServer = new WebServer(this.webServerEmitter);

  private readonly engineEmitter = new EventEmitter();
  private readonly engine = new Engine(this.engineEmitter);

  constructor() {
    this.addCliEventListeners();
    this.addWebServerEventListeners();
    setTimeout(() => {
      this.webServer.run();
      this.cli.run();
    }, 200);
  }

  private readonly ontologyGraphNames = {
    [cliTypes.ONTOLOGY_TBOX_UPLOADED]: 'tbox',
    [cliTypes.ONTOLOGY_ABOX_UPLOADED]: 'abox',
  };

  private cliOntologyChunkHandlerFactory(type: string) {
    const graphName = this.ontologyGraphNames[type];
    return ({ fileRS: ontologyRS }: { [fileRS: string]: ReadStream }) => {
      this.engineEmitter.emit(engineTypes.UPLOAD_ONTOLOGY, {
        ontologyRS,
        graphName,
      });
    };
  }

  private addCliEventListeners(): void {
    // validation request
    this.cliEmitter.on(cliTypes.VALIDATE_ENDPOINT, ({ endpoint }) => {
      const handlers = { echoEventHandler: null };
      const timeout = setTimeout(() => {
        this.engineEmitter.removeListener(
          engineTypes.ENDPOINT_ECHO,
          handlers.echoEventHandler
        );
      }, 10000);
      handlers.echoEventHandler = () => {
        clearTimeout(timeout);
        this.cliEmitter.emit(cliTypes.ENDPOINT_VALIDATED);
      };
      this.engineEmitter.once(
        engineTypes.ENDPOINT_ECHO,
        handlers.echoEventHandler
      );
      this.engineEmitter.emit(engineTypes.VALIDATE_ENDPOINT, { endpoint });
    });
    // endpoint was specified
    this.cliEmitter.on(cliTypes.ENDPOINT_SPECIFIED, ({ endpoint }) => {
      this.engineEmitter.emit(engineTypes.SPECIFY_ENDPOINT, { endpoint });
    });
    // ontology file have been uploaded
    this.cliEmitter.on(
      cliTypes.ONTOLOGY_TBOX_UPLOADED,
      this.cliOntologyChunkHandlerFactory(cliTypes.ONTOLOGY_TBOX_UPLOADED)
    );
    this.cliEmitter.on(
      cliTypes.ONTOLOGY_ABOX_UPLOADED,
      this.cliOntologyChunkHandlerFactory(cliTypes.ONTOLOGY_ABOX_UPLOADED)
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
    // firing have been triggered
    this.cliEmitter.on(cliTypes.TRIGGER_FIRING, () => {
      this.engineEmitter.emit(engineTypes.INITIATE_STEP);
    });
  }

  private addWebServerEventListeners(): void {
    this.webServerEmitter.on(
      webServerTypes.SPARQL_REQUEST,
      ({ request, sendResponse }) => {
        this.engineEmitter.emit(engineTypes.FORWARD_SPARQL_REQUEST, {
          body: request,
          callback: sendResponse,
        });
      }
    );
  }

  private addEngineEventListeners(): void {
    // ...
  }
}

export default Core;
