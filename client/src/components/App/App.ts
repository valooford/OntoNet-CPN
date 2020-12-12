import $ from "jquery";

import UI from "@components/UI/UI";
import OntoNet, {
  StateVariables,
  StateResponse,
  EnabledTransitionData,
} from "@components/OntoNet/OntoNet";

export default class App {
  ontonet: OntoNet = new OntoNet();

  ui: UI;

  constructor() {
    this.ontonet.setDataset("Petri");
    this.ui = new UI($("body"), {
      onHostnameChange() {
        console.log("hostname changed");
      },
      onPortChange() {
        console.log("port changed");
      },
      onDatasetChange() {
        console.log("datased changed");
      },
      onCpnOntologyLoad: (file: File) => {
        this.ontonet.uploadCpnOntology(file).then(() => {
          this.updateUIState();
          this.updateUIActions();
        });
      },
    });
    this.updateUIState();
  }

  updateUIState(): void {
    const statePromise: Promise<StateResponse> = this.ontonet.getCpnState();
    statePromise.then((state) => {
      this.ui.updateState({
        columns: state.head.vars,
        rows: state.results.bindings.map((b) => {
          return Object.keys(b).reduce(
            (row: { [key: string]: string }, colName: StateVariables) => {
              let { value } = b[colName];
              if (b[colName].type === "uri") {
                const i = value.indexOf("#");
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

  updateUIActions(): void {
    this.ontonet
      .getEnabledTransitionsData()
      .then((etsd: EnabledTransitionData[]) => {
        this.ui.updateActions(
          etsd.map((etd) => {
            return {
              value: etd.id,
              options: Object.keys(etd.groups).map((vals) => ({
                value: vals,
                options: Object.keys(etd.groups[vals]).map((place) => ({
                  value: place,
                  options: etd.groups[vals][place],
                })),
              })),
            };
          })
        );
      });
  }
}
