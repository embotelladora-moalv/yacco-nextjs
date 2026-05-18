import { create } from "xmlbuilder2";

/**
 * Genera el XML UBL 2.1 para la Guía de Remisión Remitente (DespatchAdvice)
 */
export function buildDespatchXml(guiaInfo: any) {
  const RUC_EMPRESA = process.env.SUNAT_RUC || "20612769151";
  const RAZON_SOCIAL =
    process.env.EMPRESA_RAZON_SOCIAL || "EMBOTELLADORA MOALV S.A.C.";

  // Ubigeo de la Planta de Moalv
  const UBIGEO_PARTIDA = process.env.UBIGEO_PARTIDA || "250101";
  const DIRECCION_PARTIDA =
    process.env.DIRECCION_PARTIDA || "AV. PRINCIPAL MZ. A LOTE. 1";

  const xmlObj = {
    DespatchAdvice: {
      "@xmlns": "urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2",
      "@xmlns:cac":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
      "@xmlns:cbc":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
      "@xmlns:ext":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",

      // Espacio para la firma digital
      "ext:UBLExtensions": {
        "ext:UBLExtension": {
          "ext:ExtensionContent": "",
        },
      },

      "cbc:UBLVersionID": "2.1",
      "cbc:CustomizationID": "2.0", // Versión exigida por SUNAT para GRE
      "cbc:ID": guiaInfo.documentId, // Ej. T001-00000150 (La serie en GRE empieza con T)
      "cbc:IssueDate": guiaInfo.issueDate, // YYYY-MM-DD
      "cbc:IssueTime": guiaInfo.issueTime || "00:00:00",
      "cbc:DespatchAdviceTypeCode": "09", // 09 = Guía de Remisión Remitente

      // EMISOR (Tu empresa)
      "cac:DespatchSupplierParty": {
        "cac:Party": {
          "cac:PartyIdentification": {
            "cbc:ID": { "@schemeID": "6", "#text": RUC_EMPRESA },
          },
          "cac:PartyLegalEntity": {
            "cbc:RegistrationName": RAZON_SOCIAL,
          },
        },
      },

      // DESTINATARIO (El Cliente)
      "cac:DeliveryCustomerParty": {
        "cac:Party": {
          "cac:PartyIdentification": {
            "cbc:ID": {
              // 6 = RUC, 1 = DNI
              "@schemeID": guiaInfo.customerDocument.length === 11 ? "6" : "1",
              "#text": guiaInfo.customerDocument,
            },
          },
          "cac:PartyLegalEntity": {
            "cbc:RegistrationName": guiaInfo.customerName,
          },
        },
      },

      // DATOS DEL TRASLADO Y TRANSPORTE
      "cac:Shipment": {
        "cbc:ID": "SUNAT_Envio",
        // 01: Venta, 14: Venta sujeta a confirmación (Ideal para venta en ruta)
        "cbc:HandlingCode": guiaInfo.motivoTraslado || "01",
        "cbc:HandlingInstructions": guiaInfo.motivoDescripcion || "VENTA",
        // Peso Bruto Total (Es obligatorio en GRE)
        "cbc:GrossWeightMeasure": {
          "@unitCode": "KGM",
          "#text": guiaInfo.pesoTotalKilos.toString(),
        },

        // Modalidad de Traslado: 02 = Transporte Privado (Tus propios camiones)
        "cac:ShipmentStage": {
          "cbc:TransportModeCode": "02",
          "cbc:TransitDirectionIndicator": "true",

          // Datos del Conductor
          "cac:DriverPerson": {
            "cbc:ID": { "@schemeID": "1", "#text": guiaInfo.driverDni },
          },
        },

        // Datos del Vehículo
        "cac:TransportHandlingUnit": {
          "cac:TransportEquipment": {
            "cbc:ID": guiaInfo.vehiclePlate, // Placa del camión
          },
        },

        // Punto de Llegada (Cliente)
        "cac:Delivery": {
          "cac:DeliveryAddress": {
            "cbc:ID": guiaInfo.ubigeoLlegada, // Obligatorio: Ubigeo de 6 dígitos
            "cac:AddressLine": {
              "cbc:Line": guiaInfo.direccionLlegada,
            },
          },
        },

        // Punto de Partida (Tu Planta)
        "cac:OriginAddress": {
          "cbc:ID": UBIGEO_PARTIDA,
          "cac:AddressLine": {
            "cbc:Line": DIRECCION_PARTIDA,
          },
        },
      },

      // LÍNEAS DE PRODUCTOS (Detalle de qué estás transportando)
      "cac:DespatchLine": guiaInfo.items.map((item: any, index: number) => ({
        "cbc:ID": (index + 1).toString(),
        "cbc:DeliveredQuantity": {
          "@unitCode": item.unitCode || "NIU", // NIU = Unidades
          "#text": item.quantity,
        },
        "cac:OrderLineReference": {
          "cbc:LineID": (index + 1).toString(),
        },
        "cac:Item": {
          "cbc:Name": item.description,
          "cac:SellersItemIdentification": {
            "cbc:ID": item.productId,
          },
        },
      })),
    },
  };

  const doc = create({ version: "1.0", encoding: "utf-8" }, xmlObj);
  return doc.end({ prettyPrint: false });
}
