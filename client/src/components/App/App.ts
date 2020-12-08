import $ from "jquery";

import UI from "@components/UI/UI";
import OntoNet from "@components/OntoNet/OntoNet";

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
  }
}
