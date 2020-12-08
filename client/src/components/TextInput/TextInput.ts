import $ from "jquery";

type Callbacks = {
  onChange?(): void;
};

export default class TextInput {
  element: HTMLElement;

  constructor(placeholder: string, callbacks: Callbacks) {
    const $element = $("<input>")
      .attr({
        type: "text",
        placeholder,
      })
      .on("change", callbacks.onChange);
    this.element = $element.get(0);
  }
}
