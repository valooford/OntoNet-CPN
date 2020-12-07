import App from "@components/App/App";

// eslint-disable-next-line
const app = new App();

// import styles from "./index.css";

// $.post(
//   "http://localhost:3030/Petri/query",
//   {
//     query: `PREFIX m: <http://www.semanticweb.org/baker/ontologies/2020/9/OntoNet-CPN-onlotogy#>
//     PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

//     SELECT ?place ?token (GROUP_CONCAT(?data;SEPARATOR=",") AS ?token_data)
//     WHERE {
//       ?place rdf:type m:Place.
//       ?place m:has_marking ?marking.
//       ?marking m:has_token ?token.
//       OPTIONAL {
//       ?token m:has_attribute ?attr.
//         {
//           SELECT ?attr ?data
//           WHERE {
//             ?attr m:has_data ?data.
//             ?attr m:has_index ?index.
//           }
//           ORDER BY ?index
//         }
//       }
//     }
//     GROUP BY ?place ?token
//     ORDER BY ?place`,
//   },
//   ({ results: { bindings } }) => {
//     console.log(bindings);
//     const colNames: string[] = bindings.reduce(
//       (_: string[], b: Record<string, unknown>): string[] => {
//         return Object.keys(b);
//       },
//       {}
//     );
//     $("#table").append(
//       `<thead><tr>${colNames
//         .map((cn: string) => `<th>${cn}</th>`)
//         .join()}</tr></thead>`
//     );
//     // .append(
//     //   `<tbody>${data
//     //     .map((row) => `<tr>${row.map((d) => `<td>${d}</td>`).join()}</tr>`)
//     //     .join()}</tbody>`
//     // );
//   }
// );
