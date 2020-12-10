import JQuery from "jquery";

const $ = JQuery;

export default class ActionPanel {
  $element: JQuery = $("<div>");

  constructor() {
    this.$element.append("transition: ", "<select>");
  }
}
