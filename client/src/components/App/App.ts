import $ from 'jquery';

import UI, { ActionPanelData } from '@components/UI/UI';
import OntoNet, {
  StateVariables,
  StateResponse,
  EnabledTransitionData,
} from '@components/OntoNet/OntoNet';

export default class App {
  ontonet: OntoNet;

  ui: UI;

  private readonly defaults = {
    hostname: 'localhost',
    port: 3030,
    dataset: 'ontonet',
  };

  constructor() {
    this.ontonet = new OntoNet(this.defaults);
    this.ui = new UI($('body'), this.defaults, {
      onHostnameChange: (hostname) => {
        this.ontonet.setHostname(hostname);
        console.log('hostname changed');
      },
      onPortChange: (port: string) => {
        if (Number.isInteger(Number(port))) {
          this.ontonet.setPort(Number(port));
          console.log('port changed');
        } else {
          console.log('port is not a number');
        }
      },
      onDatasetChange: (dataset) => {
        this.ontonet.setDataset(dataset);
        console.log('datased changed');
      },
      onCpnOntologyLoad: (file: File) => {
        this.ontonet.uploadCpnOntology(file).then(
          () => {
            this.updateUI();
          },
          () => {
            alert(`An error occurred while uploading ontology file.`);
          }
        );
      },
    });

    this.updateUI();
  }

  updateUI(): void {
    this.updateUIState();
    this.updateUIActions();
  }

  // + move some logic into OntoNet
  private updateUIState(): void {
    const statePromise: Promise<StateResponse> = this.ontonet.getCpnState();
    statePromise.then((state) => {
      this.ui.updateState({
        columns: state.head.vars.filter((v) => v !== 'token'),
        rows: state.results.bindings.map((b) => {
          return Object.keys(b).reduce(
            (row: { [key: string]: string }, colName: StateVariables) => {
              if (colName === 'token') return row;
              let { value } = b[colName];
              // + insert this functionality into OntoNet
              if (b[colName].type === 'uri') {
                const i = value.indexOf('#');
                value = value.slice(i + 1);
              }
              // eslint-disable-next-line no-param-reassign
              row[colName] = value;
              return row;
            },
            {}
          );
        }),
      });
    });
  }

  private updateUIActions(): void {
    this.ontonet
      .getEnabledTransitionsData()
      .then((etsd: EnabledTransitionData[]) => {
        const actionPanelData = etsd.reduce((data: ActionPanelData, etd) => {
          // eslint-disable-next-line no-param-reassign
          data[etd.id] = Object.keys(etd.groups);
          return data;
        }, {});
        this.ui.updateActions(
          actionPanelData,
          (t: string, values: string): void => {
            this.ontonet.performTransition(t, values).then(() => {
              this.updateUI();
            });
          }
        );
      });
  }
}
