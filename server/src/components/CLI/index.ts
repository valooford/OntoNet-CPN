import { EventEmitter } from 'events';
import p from 'path';
import { access } from 'fs/promises';
import { constants, ReadStream, createReadStream } from 'fs';

import clui from 'clui';
import chalk from 'chalk';
import inquirer from 'inquirer';

import types from './types';

const primary = chalk.cyan;

const {
  ENDPOINT_SPECIFIED,
  VALIDATE_ENDPOINT,
  ENDPOINT_VALIDATED,
  ONTOLOGY_TBOX_UPLOADED,
  ONTOLOGY_ABOX_UPLOADED,
  CONFIGURE_WITH_DESCRIPTOR,
  // VIEW_LOGS,
  TRIGGER_FIRING,
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
        {
          name: 'Configure the system using a descriptor file',
          value: CONFIGURE_WITH_DESCRIPTOR,
        },
        { name: 'Specify a SPARQL endpoint URL', value: ENDPOINT_SPECIFIED },
        {
          name: 'Upload a Tbox ontology of the CPN model',
          value: ONTOLOGY_TBOX_UPLOADED,
        },
        {
          name: 'Upload an Abox ontology of the CPN model',
          value: ONTOLOGY_ABOX_UPLOADED,
        },
        // { name: 'View the server logs', value: VIEW_LOGS },
        {
          name: 'Trigger the transition firing',
          value: TRIGGER_FIRING,
        },
      ],
      prefix: '',
    },
    {
      type: 'input',
      name: 'endpoint',
      message: 'Type endpoint URL: ',
      default: 'http://localhost:3030/ontonet',
      filter: (endpoint: string) => {
        if (!/^https?:\/\/.+/.test(endpoint)) {
          return `http://${endpoint}`;
        }
        return endpoint;
      },
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
    {
      type: 'input',
      name: 'fileRS', // RS - read stream
      message: ({ type }) => {
        const contents = {
          [ONTOLOGY_TBOX_UPLOADED]: 'ontology',
          [ONTOLOGY_ABOX_UPLOADED]: 'ontology',
          [CONFIGURE_WITH_DESCRIPTOR]: 'descriptor',
        };
        return `Type path to the ${contents[type]} file: `;
      },
      default: ({ type }) => {
        const defaults = {
          [ONTOLOGY_TBOX_UPLOADED]:
            '../../../../ontologies/OntoNet.core.v1.1.0.owl',
          [ONTOLOGY_ABOX_UPLOADED]:
            '../../../../ontologies/OntoNet.abox.heads-and-tails.v1.0.0.owl',
          [CONFIGURE_WITH_DESCRIPTOR]: '../../../../descriptors/formulas.js',
        };
        return defaults[type];
      },
      validate: async (fileRS: ReadStream | string) => {
        return typeof fileRS === 'string'
          ? 'Error! Unable to read the file.'
          : true;
      },
      filter: async (path: string) => {
        const absPath = p.isAbsolute(path) ? path : p.resolve(__dirname, path);
        try {
          await access(absPath, constants.F_OK);
          return createReadStream(absPath);
        } catch {
          return absPath;
        }
      },
      when: ({ type }) =>
        type === ONTOLOGY_TBOX_UPLOADED ||
        type === ONTOLOGY_ABOX_UPLOADED ||
        type === CONFIGURE_WITH_DESCRIPTOR,
      prefix: '',
    },
  ];

  constructor(private readonly emitter: EventEmitter) {
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
    this.handleInput();
  }
}

export default CLI;
export { types };
