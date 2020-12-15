import Button from "@components/Button/Button";
import JQuery from "jquery";

import styles from "./ActionPanel.css";

const $ = JQuery;

export type Data = {
  [value: string]: Data | string[];
};
export type Handler = (arg1: string, ...args: string[]) => void;

export default class ActionPanel {
  readonly $element: JQuery = $("<div>").addClass(styles.panel);

  readonly $actions: JQuery = $("<div>").addClass(styles.actions);

  constructor(text: string) {
    this.$element.text(text).append(this.$actions);
  }

  private fieldsData: string[] = [];

  private actionHandler: (...args: string[]) => void;

  private drawField(index: number, data: Data | string[]): void {
    const $select = $("<select>").addClass(styles.select);
    $select.append(
      $("<option>")
        .attr({
          selected: true,
          disabled: true,
          value: "",
        })
        .css({ display: "none" })
    );
    if (<string[]>data.map) {
      $select
        .append(...(<string[]>data).map((d) => $("<option>").text(d)))
        .on("change", () => {
          const fieldValue = $select.prop("value");
          if (!this.fieldsData[index]) {
            $select.nextAll().remove();
            $select.after(
              new Button(
                "Fire",
                {
                  onClick: () => {
                    this.actionHandler(...this.fieldsData);
                  },
                },
                true
              ).$element
            );
          }
          this.fieldsData = [...this.fieldsData.slice(0, index), fieldValue];
        });
    } else {
      $select
        .append(Object.keys(<Data>data).map((d) => $("<option>").text(d)))
        .on("change", () => {
          const fieldValue = $select.prop("value");
          this.fieldsData = [...this.fieldsData.slice(0, index), fieldValue];
          $select.nextAll().remove();
          this.drawField(index + 1, (<Data>data)[fieldValue]);
        });
    }
    this.$actions.append($select);
  }

  setData(data: Data, onAction: Handler): void {
    this.actionHandler = onAction;
    this.$actions.empty();
    this.drawField(0, data);
  }
}
