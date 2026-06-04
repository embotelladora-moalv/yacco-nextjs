import { ISaleRepository } from "../sales/ISaleRepository";
import { ICustomerRepository } from "../crm/ICustomerRepository";
import { IProductRepository } from "../inventory/IProductRepository";
import { IBillingRepository } from "./IBillingRepository";
import { ICorrelativeService } from "./ICorrelativeService";
import { ISunatClient } from "./ISunatClient";
import { IFileStorage } from "../shared/IFileStorage";
import { IPdfService } from "./IPdfService";
import { buildInvoiceXml } from "@/services/sunat/xmlGenerator";
import { signXml } from "@/services/sunat/xmlSigner";

export interface EmitirComprobanteInput {
  saleIds: string[];
  tipoDocumento: "01" | "03";
}

export interface EmitirComprobanteResult {
  success: boolean;
  documentId?: string;
  xmlUrl?: string;
  cdrUrl?: string;
  pdfUrl?: string;
  error?: string;
}

export class EmitirComprobanteUseCase {
  constructor(
    private saleRepo: ISaleRepository,
    private customerRepo: ICustomerRepository,
    private productRepo: IProductRepository,
    private billingRepo: IBillingRepository,
    private correlativeService: ICorrelativeService,
    private sunatClient: ISunatClient,
    private storage: IFileStorage,
    private pdfService: IPdfService
  ) {}

  async execute(input: EmitirComprobanteInput): Promise<EmitirComprobanteResult> {
    try {
      const RUC_EMPRESA = process.env.SUNAT_RUC || "20612769151";
      let customerId = "";
      let totalAmount = 0;
      const consolidatedItems: any[] = [];
      const guiasAsociadas: string[] = [];

      // 1. ITERAR Y CONSOLIDAR TODAS LAS VENTAS SELECCIONADAS
      for (const saleId of input.saleIds) {
        const saleData = await this.saleRepo.getById(saleId);
        if (!saleData) throw new Error(`Venta ${saleId} no encontrada`);

        if (!customerId) customerId = saleData.customerId;
        if (customerId !== saleData.customerId) {
          throw new Error("No puedes consolidar ventas de diferentes clientes.");
        }

        totalAmount += saleData.totalAmount;

        for (const item of saleData.items) {
          const productData = await this.productRepo.getById(item.productId);
          consolidatedItems.push({
            ...item,
            description: productData?.name || "Bidón de Agua Moalv",
          });
        }

        const greId = await this.billingRepo.findApprovedGreBySaleId(saleId);
        if (greId) {
          guiasAsociadas.push(greId);
        }
      }

      // 3. OBTENER DATOS DEL CLIENTE
      const customerData = await this.customerRepo.getById(customerId);
      if (!customerData) throw new Error("Cliente no encontrado en el CRM");

      // 4. GENERAR CORRELATIVO ÚNICO DE SUNAT
      const serie = input.tipoDocumento === "01" ? "F001" : "B001";
      const correlativo = await this.correlativeService.getNextSequence(serie);
      const documentId = `${serie}-${correlativo}`;
      const fileName = `${RUC_EMPRESA}-${input.tipoDocumento}-${documentId}`;

      const invoiceInfo = {
        documentId,
        documentType: input.tipoDocumento,
        totalAmount,
        customerDocument: customerData.documentNumber,
        customerName: customerData.name || customerData.alias || "Cliente Final",
        items: consolidatedItems,
        guiasAsociadas,
        issueDate: new Date().toISOString().split("T")[0],
      };

      // 5. GENERAR XML, FIRMAR Y ENVIAR A SUNAT
      const rawXml = buildInvoiceXml(invoiceInfo);
      const signedXml = signXml(rawXml);
      const cdrZipBase64 = await this.sunatClient.sendInvoice(fileName, signedXml);

      // 6. RUTAS DE ALMACENAMIENTO
      const xmlPath = `sunat/xml/facturas/${fileName}.xml`;
      const cdrPath = `sunat/cdr/facturas/R-${fileName}.zip`;
      const pdfPath = `sunat/pdf/facturas/${fileName}.pdf`;

      await this.storage.saveFile(xmlPath, signedXml, "application/xml");

      if (cdrZipBase64) {
        await this.storage.saveFile(cdrPath, Buffer.from(cdrZipBase64, "base64"), "application/zip");
      }

      // 6.5 GENERAR Y GUARDAR EL PDF
      try {
        const pdfBuffer = await this.pdfService.generateInvoicePdf(invoiceInfo, signedXml);
        await this.storage.saveFile(pdfPath, pdfBuffer, "application/pdf");
      } catch (pdfError) {
        console.error("⚠️ Error generando el PDF:", pdfError);
      }

      // 7. REGISTRAR EN REPOSITORIO DE FACTURACIÓN
      await this.billingRepo.saveDocument({
        id: documentId,
        saleIds: input.saleIds,
        type: input.tipoDocumento,
        status: "ACCEPTED",
        xmlUrl: xmlPath,
        cdrUrl: cdrPath,
        pdfUrl: pdfPath,
        createdAt: new Date(),
      });

      // 8. ACTUALIZAR ESTADO DE VENTAS
      await this.saleRepo.updateBilledStatus(input.saleIds, documentId);

      return {
        success: true,
        documentId,
        xmlUrl: xmlPath,
        cdrUrl: cdrPath,
        pdfUrl: pdfPath,
      };
    } catch (error: any) {
      console.error("Error en EmitirComprobanteUseCase:", error);
      return { success: false, error: error.message };
    }
  }
}
