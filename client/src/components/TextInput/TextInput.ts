import JQuery from "jquery";

import styles from "./TextInput.css";

const $ = JQuery;

export type Callback = (val: string) => void;
type Callbacks = {
  onChange?: Callback;
};

export default class TextInput {
  readonly $element: JQuery;

  constructor(
    placeholder: string,
    defaultValue: string | number = "",
    callbacks: Callbacks
  ) {
    this.$element = $("<input>")
      .attr({
        type: "text",
        value: defaultValue,
        placeholder,
      })
      .addClass(styles.textInput)
      .on("change", () => {
        callbacks.onChange(this.$element.prop("value"));
      });
  }
}
