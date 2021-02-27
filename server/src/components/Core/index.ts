import CLI from '../CLI';
import WebServer from '../WebServer';
import Engine from '../Engine';

class Core {
  private readonly cli = new CLI();

  private readonly webServer = new WebServer();

  private readonly engine = new Engine();
}

export default Core;
