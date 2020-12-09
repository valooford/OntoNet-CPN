import JQuery from "jquery";

const $ = JQuery;

export type Data = {
  columns: string[];
  rows: Array<{
    [key: string]: string;
  }>;
};

export default class Table {
  readonly $element: JQuery = $("<table>");

  setData(data: Data): void {
    const $thead = $("<thead>").append(
      data.columns.map((name) => `<th>${name}</th>`).join()
    );
    const $tbody = $("<tbody>").append(
      data.rows
        .map(
          (row) =>
            `<tr>${Object.values(row)
              .map((val) => `<td>${val}</td>`)
              .join()}</tr>`
        )
        .join()
    );
    this.$element.empty().append($thead, $tbody);
  }
}
