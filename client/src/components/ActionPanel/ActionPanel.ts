import JQuery from "jquery";

const $ = JQuery;

type Item = {
  value: string;
  options: Array<Item> | string[];
};
export type Data = Array<Item>;

export default class ActionPanel {
  readonly $element: JQuery = $("<div>");

  setData(data: Data): void {
    console.log(data);
    this.$element.empty();
    this.$element.append(
      $("<select>").append(data.map((d) => $("<option>").text(d.value)))
    );
  }
}
