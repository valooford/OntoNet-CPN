import JQuery from "jquery";
import TextInput, {
  Callback as TextInputCallback,
} from "@components/TextInput/TextInput";
import FileButton, {
  Callback as FileButtonCallback,
} from "@components/Button/FileButton/FileButton";
import Table, { Data as TableData } from "@components/Table/Table";
import ActionPanel, {
  Data as _ActionPanelData,
  Handler as _ActionPanelHandler,
} from "@components/ActionPanel/ActionPanel";
import Button from "@components/Button/Button";

import styles from "./UI.css";

export type ActionPanelData = _ActionPanelData;
export type ActionPanelHandler = _ActionPanelHandler;

const $ = JQuery;

type Configuration = {
  dataset: string;
  hostname: string;
  port: number;
};

type Callbacks = {
  onHostnameChange?: TextInputCallback;
  onPortChange?: TextInputCallback;
  onDatasetChange?: TextInputCallback;
  onCpnOntologyLoad?: FileButtonCallback;
};

export default class UI {
  hostnameInput: TextInput;

  portInput: TextInput;

  datasetInput: TextInput;

  ontologyLoader: FileButton = new FileButton();

  reloadButton: Button;

  table: Table = new Table();

  controls: ActionPanel = new ActionPanel("Actions: ");

  constructor(
    $root: JQuery,
    configuration: Configuration,
    callbacks: Callbacks = {}
  ) {
    this.hostnameInput = new TextInput("hostname", configuration.hostname, {
      onChange: callbacks.onHostnameChange,
    });
    this.portInput = new TextInput("port", configuration.port, {
      onChange: callbacks.onPortChange,
    });
    this.datasetInput = new TextInput("dataset", configuration.dataset, {
      onChange: callbacks.onDatasetChange,
    });
    this.ontologyLoader = new FileButton({
      onLoad: (file) => {
        callbacks.onCpnOntologyLoad(file);
      },
    });
    this.reloadButton = new Button("Reload Ontology", {
      onClick: () => {
        callbacks.onCpnOntologyLoad(this.ontologyLoader.getFile());
      },
    });
    const $header: JQuery = $("<header>")
      .addClass(styles.header)
      .append(
        $("<span>").addClass(styles.logo).text("OntoNet"),
        $("<div>")
          .addClass(styles.configuration)
          .append(
            this.hostnameInput.$element,
            " : ",
            this.portInput.$element,
            " / ",
            this.datasetInput.$element,
            this.ontologyLoader.$element,
            this.reloadButton.$element
          )
      );
    const $main: JQuery = $("<main>").append(
      $("<div>")
        .addClass(styles.container)
        .append(this.table.$element, this.controls.$element)
    );
    $root.append($header.get(0), $main.get(0));
  }

  updateState(data: TableData): void {
    console.log(data);
    this.table.setData(data);
  }

  updateActions(data: ActionPanelData, onAction: ActionPanelHandler): void {
    this.controls.setData(data, onAction);
  }
}
