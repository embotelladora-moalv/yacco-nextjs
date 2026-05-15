import { create } from "xmlbuilder2";

/**
 * Genera el XML en formato UBL 2.1 para Facturas (01) y Boletas (03)
 */
export function buildInvoiceXml(saleInfo: any) {
  // 1. Cálculos Financieros (Asumiendo que los precios en tu base de datos ya incluyen IGV)
  const IGV_RATE = 0.18;
  let totalVenta = 0;
  let totalGravadas = 0;
  let totalIgv = 0;

  // Transformamos los items de tu carrito al estándar InvoiceLine de SUNAT
  const invoiceLines = saleInfo.items.map((item: any, index: number) => {
    const lineTotal = item.quantity * item.unitPrice; // Total de la línea con IGV
    const valorVenta = lineTotal / (1 + IGV_RATE); // Total de la línea sin IGV (Base imponible)
    const valorUnitario = item.unitPrice / (1 + IGV_RATE); // Precio unitario sin IGV
    const igvLinea = lineTotal - valorVenta; // Monto del IGV de esta línea

    // Sumamos a los totales globales
    totalVenta += lineTotal;
    totalGravadas += valorVenta;
    totalIgv += igvLinea;

    return {
      "cbc:ID": (index + 1).toString(),
      "cbc:InvoicedQuantity": {
        "@unitCode": "NIU",
        "#text": item.quantity.toString(),
      }, // NIU = Unidades (Bienes)
      "cbc:LineExtensionAmount": {
        "@currencyID": "PEN",
        "#text": valorVenta.toFixed(2),
      },
      "cac:PricingReference": {
        "cac:AlternativeConditionPrice": {
          "cbc:PriceAmount": {
            "@currencyID": "PEN",
            "#text": item.unitPrice.toFixed(2),
          },
          "cbc:PriceTypeCode": "01", // 01 = Indica que el precio ya incluye IGV
        },
      },
      "cac:TaxTotal": {
        "cbc:TaxAmount": { "@currencyID": "PEN", "#text": igvLinea.toFixed(2) },
        "cac:TaxSubtotal": {
          "cbc:TaxableAmount": {
            "@currencyID": "PEN",
            "#text": valorVenta.toFixed(2),
          },
          "cbc:TaxAmount": {
            "@currencyID": "PEN",
            "#text": igvLinea.toFixed(2),
          },
          "cac:TaxCategory": {
            "cbc:Percent": "18.00",
            "cbc:TaxExemptionReasonCode": "10", // 10 = Operación Gravada Onerosa
            "cac:TaxScheme": {
              "cbc:ID": "1000",
              "cbc:Name": "IGV",
              "cbc:TaxTypeCode": "VAT",
            },
          },
        },
      },
      "cac:Item": {
        "cbc:Description": item.description || "Producto/Servicio",
      },
      "cac:Price": {
        "cbc:PriceAmount": {
          "@currencyID": "PEN",
          "#text": valorUnitario.toFixed(2),
        },
      },
    };
  });

  const isFactura = saleInfo.documentType === "01";

  // 2. Estructura JSON que representa el UBL 2.1 exacto de la SUNAT
  const xmlObj = {
    Invoice: {
      "@xmlns": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      "@xmlns:cac":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
      "@xmlns:cbc":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
      "@xmlns:ext":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",

      // Bloque en blanco reservado para estampar la Firma Digital (XMLDSIG)
      "ext:UBLExtensions": {
        "ext:UBLExtension": {
          "ext:ExtensionContent": "",
        },
      },

      "cbc:UBLVersionID": "2.1",
      "cbc:CustomizationID": "2.0",
      "cbc:ID": saleInfo.documentId, // Ej: F001-000001
      "cbc:IssueDate": saleInfo.issueDate, // Ej: 2026-05-15
      "cbc:IssueTime": "00:00:00",
      "cbc:InvoiceTypeCode": {
        "@listID": "0101",
        "#text": saleInfo.documentType,
      },
      "cbc:DocumentCurrencyCode": "PEN",

      // DATOS DEL EMISOR (Rosimo Inversiones)
      "cac:AccountingSupplierParty": {
        "cac:Party": {
          "cac:PartyIdentification": {
            "cbc:ID": { "@schemeID": "6", "#text": "20613042394" },
          },
          "cac:PartyLegalEntity": {
            "cbc:RegistrationName": "Rosimo Inversiones E.I.R.L.",
          },
        },
      },

      // DATOS DEL RECEPTOR (Cliente)
      "cac:AccountingCustomerParty": {
        "cac:Party": {
          "cac:PartyIdentification": {
            "cbc:ID": {
              "@schemeID": isFactura ? "6" : "1", // 6 = RUC, 1 = DNI
              "#text": saleInfo.customerDocument,
            },
          },
          "cac:PartyLegalEntity": {
            "cbc:RegistrationName": saleInfo.customerName,
          },
        },
      },

      // SUMATORIA DE IMPUESTOS GLOBALES
      "cac:TaxTotal": {
        "cbc:TaxAmount": { "@currencyID": "PEN", "#text": totalIgv.toFixed(2) },
        "cac:TaxSubtotal": {
          "cbc:TaxableAmount": {
            "@currencyID": "PEN",
            "#text": totalGravadas.toFixed(2),
          },
          "cbc:TaxAmount": {
            "@currencyID": "PEN",
            "#text": totalIgv.toFixed(2),
          },
          "cac:TaxCategory": {
            "cac:TaxScheme": {
              "cbc:ID": "1000",
              "cbc:Name": "IGV",
              "cbc:TaxTypeCode": "VAT",
            },
          },
        },
      },

      // TOTALES MONETARIOS DE LA FACTURA
      "cac:LegalMonetaryTotal": {
        "cbc:LineExtensionAmount": {
          "@currencyID": "PEN",
          "#text": totalGravadas.toFixed(2),
        },
        "cbc:TaxInclusiveAmount": {
          "@currencyID": "PEN",
          "#text": totalVenta.toFixed(2),
        },
        "cbc:PayableAmount": {
          "@currencyID": "PEN",
          "#text": totalVenta.toFixed(2),
        },
      },

      // LÍNEAS DE PRODUCTOS
      "cac:InvoiceLine": invoiceLines,
    },
  };

  // 3. Generamos el XML en texto plano
  const doc = create({ version: "1.0", encoding: "ISO-8859-1" }, xmlObj);
  return doc.end({ prettyPrint: false }); // OJO: false porque SUNAT a veces rechaza XMLs con tabulaciones/saltos de línea innecesarios.
}
