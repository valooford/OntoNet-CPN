import JQuery from "jquery";

import styles from "./Table.css";

const $ = JQuery;

export type Data = {
  columns: string[];
  rows: Array<{
    [key: string]: string;
  }>;
};

export default class Table {
  readonly $thead: JQuery = $("<thead>");

  readonly $tbody: JQuery = $("<tbody>");

  readonly $element: JQuery = $("<table>")
    .addClass(styles.table)
    .append($("<caption>").text("CPN State"), this.$thead, this.$tbody);

  setData(data: Data): void {
    this.$thead
      .empty()
      .append(data.columns.map((name) => `<th>${name}</th>`).join());
    this.$tbody.empty().append(
      data.rows
        .map(
          (row) =>
            `<tr>${Object.values(row)
              .map((val) => `<td>${val}</td>`)
              .join()}</tr>`
        )
        .join()
    );
  }
}
