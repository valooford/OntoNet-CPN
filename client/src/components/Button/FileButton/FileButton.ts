import JQuery from "jquery";

import buttonStyles from "../Button.css";
import styles from "./FileButton.css";

const $ = JQuery;

export type Callback = (file: File) => void;
type Callbacks = {
  onLoad?: Callback;
};

export default class FileInput {
  readonly $element: JQuery;

  readonly $fileInput: JQuery;

  constructor(callbacks: Callbacks = {}) {
    this.$fileInput = $("<input>")
      .addClass(styles.fileInput)
      .attr({
        type: "file",
        accept: ".owl,.rdf, application/rdf+xml,application/xml",
      })
      .on("change", () => {
        const file = this.getFile();
        console.log(file.name);
        callbacks.onLoad(file);
      });
    this.$element = $("<label>")
      .addClass([
        buttonStyles.button,
        buttonStyles.buttonSecondary,
        styles.label,
      ])
      .attr({ tabIndex: 0 })
      .text("Upload Ontology")
      .append(this.$fileInput)
      .on("keypress", (e: JQuery.Event) => {
        if (e.which === 13) {
          this.$fileInput.trigger("click");
        }
      });
  }

  getFile(): File {
    return (<HTMLInputElement>this.$fileInput.get(0)).files[0];
  }
}
