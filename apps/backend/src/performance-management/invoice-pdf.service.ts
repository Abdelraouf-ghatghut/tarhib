import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity.js';
import {
  BillingInvoice,
  GeneratedDocument,
  InvoiceStatus,
} from './entities/performance.entities.js';

const TEMPLATE_VERSION = 'invoice-v1';
const labels = {
  en: {
    invoice: 'INVOICE',
    customer: 'Customer',
    issue: 'Issue date',
    due: 'Due date',
    service: 'Service period',
    description: 'Description',
    quantity: 'Qty',
    unitPrice: 'Unit price',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Tax',
    paid: 'Paid',
    balance: 'Balance',
    verification: 'Verification',
  },
  ar: {
    invoice: 'فاتورة',
    customer: 'العميل',
    issue: 'تاريخ الإصدار',
    due: 'تاريخ الاستحقاق',
    service: 'فترة الخدمة',
    description: 'الوصف',
    quantity: 'الكمية',
    unitPrice: 'سعر الوحدة',
    total: 'الإجمالي',
    subtotal: 'المجموع الفرعي',
    tax: 'الضريبة',
    paid: 'المدفوع',
    balance: 'الرصيد',
    verification: 'التحقق',
  },
} as const;

type PdfLanguage = keyof typeof labels;

@Injectable()
export class InvoicePdfService {
  constructor(
    @InjectRepository(BillingInvoice)
    private readonly invoices: Repository<BillingInvoice>,
    @InjectRepository(GeneratedDocument)
    private readonly documents: Repository<GeneratedDocument>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    private readonly config: ConfigService,
  ) {}

  async getOrGenerate(
    invoiceId: string,
    requestedLanguage: string,
    actor?: string,
  ): Promise<GeneratedDocument> {
    const language: PdfLanguage = requestedLanguage === 'ar' ? 'ar' : 'en';
    const existing = await this.documents.findOne({
      where: {
        entityType: 'INVOICE',
        entityId: invoiceId,
        language,
        templateVersion: TEMPLATE_VERSION,
      },
    });
    if (existing) return existing;
    const invoice = await this.invoices.findOne({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('invoiceNotFound');
    if (invoice.status === InvoiceStatus.DRAFT)
      throw new ConflictException('invoiceMustBeIssued');
    const company = await this.companies.findOne({
      where: { id: invoice.companyId },
    });
    const content = await this.render(invoice, company, language);
    return this.documents.save(
      this.documents.create({
        entityType: 'INVOICE',
        entityId: invoice.id,
        language,
        templateVersion: TEMPLATE_VERSION,
        mimeType: 'application/pdf',
        fileName: `${invoice.number}-${language}.pdf`,
        sha256: createHash('sha256').update(content).digest('hex'),
        content,
        generatedBy: actor ?? null,
      }),
    );
  }

  private render(
    invoice: BillingInvoice,
    company: Company | null,
    language: PdfLanguage,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 48,
        info: {
          Title: `${labels[language].invoice} ${invoice.number}`,
          Author: 'Tarhib',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      const fontPath =
        language === 'ar'
          ? this.config.get<string>('PDF_FONT_AR_PATH')
          : this.config.get<string>('PDF_FONT_LATIN_PATH');
      if (fontPath) doc.font(fontPath);
      const l = labels[language];
      const rtl = language === 'ar';
      const align = rtl ? 'right' : 'left';
      const companyName = rtl
        ? company?.nameAr
        : company?.nameEn || company?.nameAr;
      doc.fontSize(22).fillColor('#0F172A').text('TARHIB', { align });
      doc
        .moveDown(0.25)
        .fontSize(18)
        .text(`${l.invoice} ${invoice.number}`, { align });
      doc.moveDown().fontSize(10).fillColor('#334155');
      doc.text(`${l.customer}: ${companyName ?? invoice.companyId}`, { align });
      doc.text(
        `${l.issue}: ${invoice.issueDate}    ${l.due}: ${invoice.dueDate}`,
        { align },
      );
      doc.text(`${l.service}: ${invoice.serviceFrom} - ${invoice.serviceTo}`, {
        align,
      });
      doc.moveDown();
      const x = 48;
      const widths = [250, 55, 85, 105];
      const header = [l.description, l.quantity, l.unitPrice, l.total];
      let y = doc.y;
      doc.rect(x, y, 493, 24).fill('#E2E8F0').fillColor('#0F172A');
      header.forEach((text, i) =>
        doc.text(
          text,
          x + widths.slice(0, i).reduce((a, b) => a + b, 0) + 5,
          y + 7,
          { width: widths[i] - 10, align: i === 0 ? align : 'right' },
        ),
      );
      y += 28;
      for (const line of invoice.lines) {
        const net = Math.max(
          0,
          line.quantity * line.unitPrice - (line.discount ?? 0),
        );
        doc
          .fillColor('#0F172A')
          .text(line.description, x + 5, y, { width: widths[0] - 10, align });
        doc.text(String(line.quantity), x + widths[0], y, {
          width: widths[1] - 5,
          align: 'right',
        });
        doc.text(
          Number(line.unitPrice).toFixed(2),
          x + widths[0] + widths[1],
          y,
          { width: widths[2] - 5, align: 'right' },
        );
        doc.text(net.toFixed(2), x + widths[0] + widths[1] + widths[2], y, {
          width: widths[3] - 5,
          align: 'right',
        });
        y += 24;
      }
      doc.y = Math.max(y + 12, doc.y);
      const money = (value: number) =>
        `${Number(value).toFixed(2)} ${invoice.currency}`;
      doc
        .fontSize(11)
        .text(`${l.subtotal}: ${money(invoice.subtotal)}`, { align: 'right' });
      doc.text(`${l.tax}: ${money(invoice.taxAmount)}`, { align: 'right' });
      doc
        .fontSize(13)
        .text(`${l.total}: ${money(invoice.totalAmount)}`, { align: 'right' });
      doc
        .fontSize(10)
        .text(
          `${l.paid}: ${money(invoice.paidAmount)}   ${l.balance}: ${money(Number(invoice.totalAmount) - Number(invoice.paidAmount))}`,
          { align: 'right' },
        );
      doc
        .moveDown(2)
        .fontSize(8)
        .fillColor('#64748B')
        .text(`${l.verification}: ${invoice.id} - ${TEMPLATE_VERSION}`, {
          align: 'center',
        });
      doc.end();
    });
  }
}
