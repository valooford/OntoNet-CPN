import JQuery from "jquery";
import TextInput, {
  Callback as TextInputCallback,
} from "@components/TextInput/TextInput";
import FileInput, {
  Callback as FileInputCallback,
} from "@components/FileInput/FileInput";
import Table, { Data as TableData } from "@components/Table/Table";
import ActionPanel, {
  Data as _ActionPanelData,
  Handler as _ActionPanelHandler,
} from "@components/ActionPanel/ActionPanel";
import Button from "@components/Button/Button";

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
  onCpnOntologyLoad?: FileInputCallback;
};

export default class UI {
  hostnameInput: TextInput;

  portInput: TextInput;

  datasetInput: TextInput;

  ontologyLoader: FileInput = new FileInput();

  reloadButton: Button;

  table: Table = new Table();

  actionPanel: ActionPanel = new ActionPanel();

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
    this.ontologyLoader = new FileInput({
      onLoad: (file) => {
        callbacks.onCpnOntologyLoad(file);
      },
    });
    this.reloadButton = new Button("Reload", {
      onClick: () => {
        callbacks.onCpnOntologyLoad(this.ontologyLoader.getFile());
      },
    });
    const $header: JQuery = $("<header>").append(
      this.hostnameInput.$element,
      this.portInput.$element,
      this.datasetInput.$element,
      this.ontologyLoader.$element,
      this.reloadButton.$element
    );
    const $main: JQuery = $("<main>").append(
      this.table.$element,
      this.actionPanel.$element
    );
    $root.append($header.get(0), $main.get(0));
  }

  updateState(data: TableData): void {
    console.log(data);
    this.table.setData(data);
  }

  updateActions(data: ActionPanelData, onAction: ActionPanelHandler): void {
    this.actionPanel.setData(data, onAction);
  }
}
