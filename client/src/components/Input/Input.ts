import $ from "jquery";

export default class Input {
  element: HTMLElement;

  constructor(placeholder: string) {
    const $element = $("<input>").attr("placeholder", placeholder);
    this.element = $element.get(0);
  }
}
