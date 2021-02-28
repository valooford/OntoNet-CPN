import clui from 'clui';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { EventEmitter } from 'events';

import types from './types';

const primary = chalk.cyan;

const {
  ENDPOINT_SPECIFIED,
  VALIDATE_ENDPOINT,
  ENDPOINT_VALIDATED,
  UPLOAD_ONTOLOGY,
  CONFIGURE_WITH_DESCRIPTOR,
  VIEW_LOGS,
} = types;

class CLI {
  private readonly spinner = new clui.Spinner('loading...');
  private readonly spinnerEndpointMessage = 'Verifying the endpoint URL...';

  private readonly questions = [
    {
      type: 'list',
      name: 'type',
      message: 'Menu',
      choices: [
        { name: 'Specify a SPARQL endpoint URL', value: ENDPOINT_SPECIFIED },
        { name: 'Upload an ontology of the CPN model', value: UPLOAD_ONTOLOGY },
        {
          name: 'Configure the system using a descriptor file',
          value: CONFIGURE_WITH_DESCRIPTOR,
        },
        { name: 'View the server logs', value: VIEW_LOGS },
      ],
      prefix: '',
    },
    {
      type: 'input',
      name: 'endpoint',
      message: 'Type endpoint URL: ',
      default: 'localhost:3030',
      validate: async (endpoint: string) => {
        if (!!this.emitter.listeners(ENDPOINT_VALIDATED).length) {
          return 'Error! Only one endpoint can be verified at a time.';
        }
        this.spinner.message(
          this.spinnerEndpointMessage +
            ' '.repeat(
              process.stdout.columns - this.spinnerEndpointMessage.length - 4
            )
        );
        this.spinner.start();
        const result = await new Promise((res) => {
          const rejectionTimeout = setTimeout(() => {
            this.emitter.removeAllListeners(ENDPOINT_VALIDATED);
            res(`Error! Endpoint '${endpoint}' is unavailable.`);
          }, 10000);
          this.emitter.once(ENDPOINT_VALIDATED, () => {
            clearTimeout(rejectionTimeout);
            res(true);
          });
          this.emitter.emit(VALIDATE_ENDPOINT, { endpoint });
        });
        this.spinner.stop();
        return result;
      },
      when: ({ type }) => type === ENDPOINT_SPECIFIED,
      prefix: '',
    },
  ];

  constructor(readonly emitter: EventEmitter) {
    this.spinner.start();
  }

  run(): void {
    this.spinner.stop();
    console.log(`Running ${primary.bold('OntoNet')} version 1.0.0.`);
    this.handleInput();
  }

  private async handleInput(): Promise<void> {
    const { type, ...payload } = await inquirer.prompt(this.questions);
    // const action = { type, payload };
    this.emitter.emit(type, payload);
  }
}

export default CLI;
export { types };
