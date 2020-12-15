import JQuery from "jquery";

import styles from "./Button.css";

const $ = JQuery;

export type EventHandler = () => void;
type EventHandlers = {
  onClick: EventHandler;
};

export default class Button {
  readonly $element: JQuery;

  constructor(text: string, eventHandlers: EventHandlers, isSecondary = false) {
    const classList = [styles.button];
    if (isSecondary) classList.push(styles.buttonSecondary);
    this.$element = $("<button>")
      .addClass(classList)
      .attr("type", "button")
      .text(text)
      .on("click", () => {
        eventHandlers.onClick();
      });
  }
}
