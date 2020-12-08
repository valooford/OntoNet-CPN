import $ from "jquery";

type Callbacks = {
  onLoad?(file: File): void;
};

export default class FileInput {
  element: HTMLElement;

  constructor(callbacks: Callbacks = {}) {
    const $element = $("<input>").attr({
      type: "file",
    });

    this.element = $element.get(0);
    $element.on("change", () => {
      callbacks.onLoad((<HTMLInputElement>this.element).files[0]);
    });
  }
}
