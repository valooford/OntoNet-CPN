import $ from "jquery";

type Parameters =
  | {
      dataset: string;
      hostname?: string;
      port?: number;
    }
  | undefined;

export type Variables = "place" | "token" | "token_data";
export type Response = {
  head: {
    vars: Variables[];
  };
  results: {
    bindings: Array<
      {
        [key in Variables]: {
          type: string;
          value: string;
        };
      }
    >;
  };
};

export default class OntoNet {
  protected hostname: string;

  protected port: number;

  protected dataset: string;

  constructor(params: Parameters = undefined) {
    this.dataset = params?.dataset;
    this.hostname = params?.hostname ?? "localhost";
    this.port = params?.port ?? 3030;
  }

  setHostname(hostname: string): void {
    this.hostname = hostname;
  }

  setPort(port: number): void {
    this.port = port;
  }

  setDataset(dataset: string): void {
    this.dataset = dataset;
  }

  uploadCpnOntology(file: File): void {
    const formData: FormData = new FormData();
    formData.append("graph", file);
    $.post({
      url: `http://${this.hostname}:${this.port}/${this.dataset}/update`,
      data: {
        update: "DELETE {?s ?p ?o.} WHERE {?s ?p ?o.}",
      },
    }).done(() => {
      $.post({
        url: `http://${this.hostname}:${this.port}/${this.dataset}/upload`,
        data: formData,
        processData: false,
        contentType: false,
        complete(res, status) {
          if (status === "success") {
            console.log("CPN Ontology was uploaded");
          } else {
            console.log("Error while uploading CPN Ontology");
          }
        },
      });
    });
  }

  getCpnState(): Promise<Response> {
    return Promise.resolve(
      $.post({
        url: `http://${this.hostname}:${this.port}/${this.dataset}/sparql`,
        data: {
          query: `
        PREFIX m: <http://www.semanticweb.org/baker/ontologies/2020/9/OntoNet-CPN-onlotogy#>
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
        ORDER BY ?place
        `,
        },
        success(res: Response): Response {
          return res;
        },
      })
    );
  }
}
