import $ from "jquery";

// import styles from "./index.css";

console.log("Hello OntoNet!");

// const $table = $("#table");

// const data = [
//   [":p1", ":token1", "a,b"],
//   [":p2", ":token2", "a"],
// ];

$.post(
  "http://localhost:3030/Petri/query",
  {
    query: `PREFIX m: <http://www.semanticweb.org/baker/ontologies/2020/9/OntoNet-CPN-onlotogy#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    
    SELECT ?place ?token (GROUP_CONCAT(?data;SEPARATOR=",") AS ?token_data)
    WHERE {
      ?place rdf:type m:Place.
      ?place m:has_marking ?marking.
      ?marking m:has_token ?token.
      OPTIONAL {
      ?token m:has_attribute ?attr.
        {
          SELECT ?attr ?data
          WHERE {
            ?attr m:has_data ?data.
            ?attr m:has_index ?index.
          }
          ORDER BY ?index
        }
      }
    }
    GROUP BY ?place ?token
    ORDER BY ?place`,
  },
  ({ results: bindings }) => {
    const { keys: colNames } = bindings.reduce(
      (_: Record<string, unknown>, b: Record<string, unknown>) => {
        return Object.keys(b);
      },
      {}
    );
    $("#table").append(
      `<thead><tr>${colNames
        .map((cn: string) => `<th>${cn}</th>`)
        .join()}</tr></thead>`
    );
    // .append(
    //   `<tbody>${data
    //     .map((row) => `<tr>${row.map((d) => `<td>${d}</td>`).join()}</tr>`)
    //     .join()}</tbody>`
    // );
  }
);
