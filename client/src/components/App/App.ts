import $ from 'jquery';

import UI from '@components/UI/UI';
import OntoNet, {
  StateVariables,
  StateResponse,
} from '@components/OntoNet/OntoNet';
import Reasoner from '@components/Reasoner/Reasoner';

export default class App {
  ontonet: OntoNet;

  reasoner: Reasoner;

  ui: UI;

  private readonly defaults = {
    hostname: 'localhost',
    port: 3030,
    dataset: 'ontonet',
  };

  private endpoint = this.defaults;

  constructor() {
    this.ontonet = new OntoNet(this.getEndpointUrl());
    this.reasoner = new Reasoner(this.getEndpointUrl());
    this.ui = new UI($('body'), this.defaults, {
      onHostnameChange: (hostname) => {
        this.setEndpointFields({ hostname });
        console.log('hostname changed');
      },
      onPortChange: (port: string) => {
        if (Number.isInteger(Number(port))) {
          this.setEndpointFields({ port: Number(port) });
          console.log('port changed');
        } else {
          console.log('port is not a number');
        }
      },
      onDatasetChange: (dataset) => {
        this.setEndpointFields({ dataset });
        console.log('datased changed');
      },
      onCpnOntologyLoad: (file: File) => {
        this.ontonet.uploadCpnOntology(file).then(
          () => {
            this.updateUI();
            this.reasoner.updateConfiguration();
          },
          () => {
            alert(`An error occurred while uploading ontology file.`);
          }
        );
      },
    });
    this.updateUI();
  }

  private getEndpointUrl() {
    return `http://${this.endpoint.hostname}:${this.endpoint.port}/${this.endpoint.dataset}`;
  }

  private onEndpointUpdate() {
    this.ontonet.setEndpointUrl(this.getEndpointUrl());
    this.reasoner.setEndpointUrl(this.getEndpointUrl());
  }

  private setEndpointFields(fields: {
    hostname?: string;
    port?: number;
    dataset?: string;
  }) {
    this.endpoint = { ...this.endpoint, ...fields };
    this.onEndpointUpdate();
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
        columns: state.head.vars,
        rows: state.results.bindings.map((b) => {
          return Object.keys(b).reduce(
            (row: { [key: string]: string }, colName: StateVariables) => {
              // + insert this functionality into OntoNet
              // eslint-disable-next-line no-param-reassign
              row[colName] = b[colName].value;
              return row;
            },
            {}
          );
        }),
      });
    });
  }

  private updateUIActions(): void {
    this.reasoner.run();
    // this.ontonet
    //   .getEnabledTransitionsData()
    //   .then((etsd: EnabledTransitionData[]) => {
    //     const actionPanelData = etsd.reduce((data: ActionPanelData, etd) => {
    //       // eslint-disable-next-line no-param-reassign
    //       data[etd.id] = Object.keys(etd.groups);
    //       return data;
    //     }, {});
    //     this.ui.updateActions(
    //       actionPanelData,
    //       (t: string, values: string): void => {
    //         this.ontonet.performTransition(t, values).then(() => {
    //           this.updateUI();
    //         });
    //       }
    //     );
    //   });
  }
}
