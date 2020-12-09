import $ from "jquery";

import UI from "@components/UI/UI";
import OntoNet, { Variables, Response } from "@components/OntoNet/OntoNet";

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
        // console.log(`ontology loaded: ${file}`);
        this.ontonet.uploadCpnOntology(file);
      },
    });
    const statePromise: Promise<Response> = this.ontonet.getCpnState();
    statePromise.then((state) => {
      this.ui.setData({
        columns: state.head.vars,
        rows: state.results.bindings.map((b) => {
          return Object.keys(b).reduce(
            (row: { [key: string]: string }, colName: Variables) => {
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
}
