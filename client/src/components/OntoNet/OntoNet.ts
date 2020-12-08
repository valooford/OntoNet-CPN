import $ from "jquery";

type Parameters =
  | {
      dataset: string;
      hostname?: string;
      port?: number;
    }
  | undefined;

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
}
