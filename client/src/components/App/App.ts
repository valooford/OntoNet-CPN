import $ from "jquery";

import UI from "@components/UI/UI";

export default class App {
  ui: UI;

  constructor() {
    this.ui = new UI($("body"));
  }
}
