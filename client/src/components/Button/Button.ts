import JQuery from "jquery";

const $ = JQuery;

export type EventHandler = () => void;
type EventHandlers = {
  onClick: EventHandler;
};

export default class Button {
  readonly $element: JQuery;

  constructor(text: string, eventHandlers: EventHandlers) {
    this.$element = $("<button>")
      .text(text)
      .on("click", () => {
        eventHandlers.onClick();
      });
  }
}
