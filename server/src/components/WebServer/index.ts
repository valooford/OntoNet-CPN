import { EventEmitter } from 'events';

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import types from './types';

const { SPARQL_REQUEST } = types;

class WebServer {
  private readonly PORT = 3000;

  private readonly server = express();

  constructor(readonly emitter: EventEmitter) {
    this.server.use(cors());
    this.server.use(bodyParser.urlencoded({ extended: false }));
    this.addEventListeners();
  }

  run(): void {
    this.server.listen(this.PORT, () => {
      // console.log(`Listening on port ${this.PORT}...`);
      return;
    });
  }

  private addEventListeners(): void {
    this.server.post('/sparql', async (req, res) => {
      const responseData = await new Promise((resolve) => {
        this.emitter.emit(SPARQL_REQUEST, {
          request: req.body.query,
          sendResponse: resolve,
        });
      });
      res.send(responseData);
    });
  }
}

export default WebServer;
export { types };
