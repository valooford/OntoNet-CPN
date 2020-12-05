import $ from "jquery";

// import styles from "./index.css";

console.log("Hello OntoNet!");

// const $table = $("#table");

const colNames = ["placeId", "tokenId", "values"];

const data = [
  [":p1", ":token1", "a,b"],
  [":p2", ":token2", "a"],
];

// $("<th><td>Hello OntoNet!</th></tr>").appendTo($table);

$("#table")
  .append(
    `<thead><tr>${colNames.map((cn) => `<th>${cn}</th>`).join()}</tr></thead>`
  )
  .append(
    `<tbody>${data
      .map((row) => `<tr>${row.map((d) => `<td>${d}</td>`).join()}</tr>`)
      .join()}</tbody>`
  );
