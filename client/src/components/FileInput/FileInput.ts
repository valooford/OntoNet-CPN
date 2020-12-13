import JQuery from "jquery";

const $ = JQuery;

export type Callback = (file: File) => void;
type Callbacks = {
  onLoad?: Callback;
};

export default class FileInput {
  readonly $element: JQuery;

  constructor(callbacks: Callbacks = {}) {
    this.$element = $("<input>")
      .attr({
        type: "file",
      })
      .on("change", () => {
        callbacks.onLoad(this.getFile());
      });
  }

  getFile(): File {
    return (<HTMLInputElement>this.$element.get(0)).files[0];
  }
}
