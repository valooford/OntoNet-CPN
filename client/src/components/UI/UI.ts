import JQuery from "jquery";
import TextInput from "@components/TextInput/TextInput";
import FileInput from "@components/FileInput/FileInput";
import Table, { Data as TableData } from "@components/Table/Table";
import ActionPanel, {
  Data as ActionPanelData,
} from "@components/ActionPanel/ActionPanel";

const $ = JQuery;

type Callbacks = {
  onHostnameChange?(): void;
  onPortChange?(): void;
  onDatasetChange?(): void;
  onCpnOntologyLoad?(file: File): void;
};

export default class UI {
  hostnameInput: TextInput;

  portInput: TextInput;

  datasetInput: TextInput;

  ontologyLoader: FileInput = new FileInput();

  table: Table = new Table();

  actionPanel: ActionPanel = new ActionPanel();

  constructor($root: JQuery, callbacks: Callbacks = {}) {
    this.hostnameInput = new TextInput("hostname", {
      onChange: callbacks.onHostnameChange,
    });
    this.portInput = new TextInput("port", {
      onChange: callbacks.onPortChange,
    });
    this.datasetInput = new TextInput("dataset", {
      onChange: callbacks.onDatasetChange,
    });
    this.ontologyLoader = new FileInput({
      onLoad: (file) => {
        callbacks.onCpnOntologyLoad(file);
      },
    });
    const $header: JQuery = $("<header>").append(
      this.hostnameInput.element,
      this.portInput.element,
      this.datasetInput.element,
      this.ontologyLoader.element
    );
    const $main: JQuery = $("<main>").append(
      this.table.$element,
      this.actionPanel.$element
    );
    $root.append($header.get(0), $main.get(0));
  }

  updateState(data: TableData): void {
    this.table.setData(data);
  }

  updateActions(data: ActionPanelData): void {
    this.actionPanel.setData(data);
  }
}
