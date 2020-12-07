import JQuery from "jquery";
import Input from "@components/Input/Input";

const $ = JQuery;

export default class UI {
  $hostnameInput: Input = new Input("hostname");

  $portInput: Input = new Input("port");

  $datasetInput: Input = new Input("dataset");

  constructor($root: JQuery) {
    const $header: JQuery = $("<header>").append(
      this.$hostnameInput.element,
      this.$portInput.element,
      this.$datasetInput.element
    );
    const $main: JQuery = $("<main>").append("Hello OntoNet");
    $root.append($header.get(0), $main.get(0));
  }
}
