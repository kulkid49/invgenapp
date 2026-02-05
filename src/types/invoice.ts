export interface MaterialLineItem {
  id: string;
  materialNo: string;
  description: string;
  qty: number;
  unit: string;
  price: number;
}

export interface BankDetails {
  bankName: string;
  account: string;
  swift: string;
}

export interface InvoiceData {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  billTo: {
    companyName: string;
    address: string;
  };
  refPO: string;
  currency: string;
  lineItems: MaterialLineItem[];
  taxRate: number;
  bankDetails: BankDetails;
}

export type InvoiceTemplate = 
  | 'classic'
  | 'modern'
  | 'minimal'
  | 'professional'
  | 'elegant'
  | 'corporate'
  | 'simple'
  | 'bold'
  | 'compact'
  | 'premium';

export const invoiceTemplates: { id: InvoiceTemplate; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic', description: 'Traditional invoice layout with clean lines' },
  { id: 'modern', name: 'Modern', description: 'Contemporary design with subtle colors' },
  { id: 'minimal', name: 'Minimal', description: 'Clean and simple with minimal styling' },
  { id: 'professional', name: 'Professional', description: 'Business-focused with detailed sections' },
  { id: 'elegant', name: 'Elegant', description: 'Sophisticated design with refined typography' },
  { id: 'corporate', name: 'Corporate', description: 'Formal layout for enterprise use' },
  { id: 'simple', name: 'Simple', description: 'Basic layout focusing on essentials' },
  { id: 'bold', name: 'Bold', description: 'Strong visual hierarchy with bold headers' },
  { id: 'compact', name: 'Compact', description: 'Space-efficient layout for many items' },
  { id: 'premium', name: 'Premium', description: 'High-end design with premium feel' }
];

export const defaultInvoiceData: InvoiceData = {
  vendorName: "New_Domestic Customer US 6 (Returns)",
  invoiceNumber: "INV-2526-035",
  invoiceDate: "2026-01-29",
  billTo: {
    companyName: "Nestle Limited",
    address: "Noida City, sector 15, 700052"
  },
  refPO: "4500000344",
  currency: "INR",
  lineItems: [
    {
      id: "1",
      materialNo: "CH-9003_1",
      description: "Polyethylene Glycols",
      qty: 10,
      unit: "PC",
      price: 50.00
    },
    {
      id: "2",
      materialNo: "504",
      description: "Copper Oxide_New",
      qty: 10,
      unit: "PC",
      price: 2208.50
    }
  ],
  taxRate: 18,
  bankDetails: {
    bankName: "Sample Bank",
    account: "9988776655",
    swift: "SAMPLE01"
  }
};
