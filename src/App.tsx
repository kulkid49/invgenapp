import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FileText, Download, FileDown, LayoutTemplate } from 'lucide-react';
import { defaultInvoiceData, invoiceTemplates } from '@/types/invoice';
import type { InvoiceData, MaterialLineItem, InvoiceTemplate } from '@/types/invoice';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './App.css';

function App() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(defaultInvoiceData);
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>('classic');
  const invoiceRef = useRef<HTMLDivElement>(null);

  const calculateLineTotal = (item: MaterialLineItem): number => {
    return item.qty * item.price;
  };

  const calculateSubtotal = (): number => {
    return invoiceData.lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  const calculateTax = (): number => {
    return (calculateSubtotal() * invoiceData.taxRate) / 100;
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateTax();
  };

  const updateLineItem = (id: string, field: keyof MaterialLineItem, value: string | number) => {
    setInvoiceData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addLineItem = () => {
    const newItem: MaterialLineItem = {
      id: Date.now().toString(),
      materialNo: '',
      description: '',
      qty: 1,
      unit: 'PC',
      price: 0
    };
    setInvoiceData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem]
    }));
  };

  const removeLineItem = (id: string) => {
    if (invoiceData.lineItems.length > 1) {
      setInvoiceData(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter(item => item.id !== id)
      }));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}, ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
  };

  const generateInvoiceHTML = (): string => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const total = calculateTotal();

    const templates: Record<InvoiceTemplate, string> = {
      classic: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
    .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .company-info h1 { font-size: 14px; color: #666; margin-bottom: 5px; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { font-size: 28px; color: #333; margin-bottom: 10px; }
    .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .meta-box { padding: 15px; background: #f9f9f9; border-radius: 4px; }
    .meta-box h3 { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
    .meta-box p { font-size: 14px; color: #333; line-height: 1.5; }
    .meta-row { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { background: #333; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
    .items-table td { padding: 12px; border-bottom: 1px solid #ddd; font-size: 14px; }
    .items-table tr:nth-child(even) { background: #f9f9f9; }
    .text-right { text-align: right; }
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .totals-box { width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
    .total-row.final { border-top: 2px solid #333; border-bottom: 2px solid #333; font-weight: bold; font-size: 16px; }
    .bank-details { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
    .bank-details h3 { font-size: 14px; color: #666; margin-bottom: 10px; }
    .bank-details p { font-size: 13px; color: #333; line-height: 1.8; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info"><h1>${invoiceData.vendorName}</h1></div>
      <div class="invoice-title"><h2>INVOICE</h2></div>
    </div>
    <div class="invoice-meta">
      <div class="meta-box">
        <h3>Bill To:</h3>
        <p><strong>${invoiceData.billTo.companyName}</strong></p>
        <p>${invoiceData.billTo.address}</p>
      </div>
      <div class="meta-box">
        <div class="meta-row"><span>Invoice #</span><span><strong>${invoiceData.invoiceNumber}</strong></span></div>
        <div class="meta-row"><span>Invoice Date</span><span>${formatDate(invoiceData.invoiceDate)}</span></div>
        <div class="meta-row"><span>Ref. PO</span><span>${invoiceData.refPO}</span></div>
        <div class="meta-row"><span>Currency</span><span>${invoiceData.currency}</span></div>
      </div>
    </div>
    <table class="items-table">
      <thead><tr><th>Material No.</th><th>Description</th><th>Qty</th><th>Unit</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead>
      <tbody>${invoiceData.lineItems.map(item => `<tr><td>${item.materialNo}</td><td>${item.description}</td><td>${item.qty}</td><td>${item.unit}</td><td class="text-right">${item.price.toFixed(2)}</td><td class="text-right">${calculateLineTotal(item).toFixed(2)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="totals-section">
      <div class="totals-box">
        <div class="total-row"><span>Subtotal</span><span>${subtotal.toFixed(2)} ${invoiceData.currency}</span></div>
        <div class="total-row"><span>Tax (${invoiceData.taxRate}%)</span><span>${tax.toFixed(2)} ${invoiceData.currency}</span></div>
        <div class="total-row final"><span>TOTAL</span><span>${total.toFixed(2)} ${invoiceData.currency}</span></div>
      </div>
    </div>
    <div class="bank-details">
      <h3>Bank Details:</h3>
      <p><strong>Bank Name:</strong> ${invoiceData.bankDetails.bankName}<br><strong>Account:</strong> ${invoiceData.bankDetails.account}<br><strong>SWIFT:</strong> ${invoiceData.bankDetails.swift}</p>
    </div>
  </div>
</body>
</html>`,

      modern: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; min-height: 100vh; }
    .invoice-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; padding: 50px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 3px solid #667eea; }
    .vendor-name { font-size: 18px; color: #667eea; font-weight: 600; }
    .invoice-title { font-size: 42px; color: #333; font-weight: 300; letter-spacing: 2px; }
    .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
    .bill-to-box { background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 25px; border-radius: 12px; }
    .bill-to-box h3 { color: #667eea; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; }
    .info-box { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
    .info-item label { display: block; font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 5px; }
    .info-item span { font-size: 14px; color: #333; font-weight: 500; }
    .items-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; }
    .items-table th { background: #667eea; color: white; padding: 15px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .items-table th:first-child { border-radius: 8px 0 0 0; }
    .items-table th:last-child { border-radius: 0 8px 0 0; }
    .items-table td { padding: 15px; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
    .items-table tr:hover { background: #f8f9fa; }
    .text-right { text-align: right; }
    .totals { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; margin-left: auto; width: 350px; }
    .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2); }
    .total-row.final { border-top: 2px solid white; border-bottom: none; font-size: 20px; font-weight: bold; margin-top: 10px; padding-top: 15px; }
    .bank-details { margin-top: 40px; padding: 25px; background: #f8f9fa; border-radius: 12px; }
    .bank-details h3 { color: #667eea; font-size: 14px; margin-bottom: 15px; }
    .bank-details p { line-height: 2; color: #555; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="vendor-name">${invoiceData.vendorName}</div>
      <div class="invoice-title">INVOICE</div>
    </div>
    <div class="invoice-meta">
      <div class="bill-to-box">
        <h3>Bill To</h3>
        <p style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 8px;">${invoiceData.billTo.companyName}</p>
        <p style="color: #666;">${invoiceData.billTo.address}</p>
      </div>
      <div class="info-box">
        <div class="info-item"><label>Invoice #</label><span>${invoiceData.invoiceNumber}</span></div>
        <div class="info-item"><label>Date</label><span>${formatDate(invoiceData.invoiceDate)}</span></div>
        <div class="info-item"><label>Ref. PO</label><span>${invoiceData.refPO}</span></div>
        <div class="info-item"><label>Currency</label><span>${invoiceData.currency}</span></div>
      </div>
    </div>
    <table class="items-table">
      <thead><tr><th>Material No.</th><th>Description</th><th>Qty</th><th>Unit</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead>
      <tbody>${invoiceData.lineItems.map(item => `<tr><td>${item.materialNo}</td><td>${item.description}</td><td>${item.qty}</td><td>${item.unit}</td><td class="text-right">${item.price.toFixed(2)}</td><td class="text-right">${calculateLineTotal(item).toFixed(2)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>${subtotal.toFixed(2)} ${invoiceData.currency}</span></div>
      <div class="total-row"><span>Tax (${invoiceData.taxRate}%)</span><span>${tax.toFixed(2)} ${invoiceData.currency}</span></div>
      <div class="total-row final"><span>TOTAL</span><span>${total.toFixed(2)} ${invoiceData.currency}</span></div>
    </div>
    <div class="bank-details">
      <h3>Bank Details</h3>
      <p><strong>Bank:</strong> ${invoiceData.bankDetails.bankName} | <strong>Account:</strong> ${invoiceData.bankDetails.account} | <strong>SWIFT:</strong> ${invoiceData.bankDetails.swift}</p>
    </div>
  </div>
</body>
</html>`,

      minimal: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; padding: 60px; }
    .invoice-container { max-width: 700px; margin: 0 auto; }
    .header { margin-bottom: 60px; }
    .vendor { font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
    .invoice-num { font-size: 48px; font-weight: 200; color: #000; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 50px; }
    .bill-to { max-width: 250px; }
    .bill-to h4 { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
    .bill-to p { font-size: 14px; line-height: 1.6; color: #333; }
    .details { text-align: right; }
    .details p { font-size: 13px; color: #666; margin-bottom: 5px; }
    .details p strong { color: #000; margin-left: 15px; }
    .items { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    .items th { text-align: left; padding: 15px 0; border-bottom: 2px solid #000; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; font-weight: 400; }
    .items td { padding: 20px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    .items .num { text-align: right; }
    .totals { text-align: right; margin-bottom: 50px; }
    .totals p { font-size: 14px; color: #666; margin-bottom: 10px; }
    .totals p.total { font-size: 24px; color: #000; font-weight: 300; margin-top: 20px; padding-top: 20px; border-top: 2px solid #000; }
    .bank { font-size: 12px; color: #999; line-height: 1.8; }
    .bank strong { color: #333; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="vendor">${invoiceData.vendorName}</div>
      <div class="invoice-num">Invoice</div>
    </div>
    <div class="meta">
      <div class="bill-to">
        <h4>Bill To</h4>
        <p><strong>${invoiceData.billTo.companyName}</strong><br>${invoiceData.billTo.address}</p>
      </div>
      <div class="details">
        <p><strong>#</strong> ${invoiceData.invoiceNumber}</p>
        <p><strong>Date</strong> ${formatDate(invoiceData.invoiceDate)}</p>
        <p><strong>PO</strong> ${invoiceData.refPO}</p>
        <p><strong>Currency</strong> ${invoiceData.currency}</p>
      </div>
    </div>
    <table class="items">
      <thead><tr><th>Item</th><th>Description</th><th>Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
      <tbody>${invoiceData.lineItems.map(item => `<tr><td>${item.materialNo}</td><td>${item.description}</td><td>${item.qty} ${item.unit}</td><td class="num">${item.price.toFixed(2)}</td><td class="num">${calculateLineTotal(item).toFixed(2)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="totals">
      <p>Subtotal ${subtotal.toFixed(2)} ${invoiceData.currency}</p>
      <p>Tax (${invoiceData.taxRate}%) ${tax.toFixed(2)} ${invoiceData.currency}</p>
      <p class="total">Total ${total.toFixed(2)} ${invoiceData.currency}</p>
    </div>
    <div class="bank">
      <strong>Bank:</strong> ${invoiceData.bankDetails.bankName} | <strong>Account:</strong> ${invoiceData.bankDetails.account} | <strong>SWIFT:</strong> ${invoiceData.bankDetails.swift}
    </div>
  </div>
</body>
</html>`,

      professional: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; background: #f0f2f5; padding: 30px; }
    .invoice-container { max-width: 850px; margin: 0 auto; background: white; padding: 50px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .top-bar { background: #1a365d; color: white; padding: 20px 50px; margin: -50px -50px 40px -50px; display: flex; justify-content: space-between; align-items: center; }
    .top-bar .vendor { font-size: 16px; font-weight: 600; }
    .top-bar .doc-type { font-size: 24px; text-transform: uppercase; letter-spacing: 3px; }
    .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .section { padding: 25px; background: #f8fafc; border-left: 4px solid #1a365d; }
    .section h3 { font-size: 12px; color: #1a365d; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
    .section p { font-size: 15px; line-height: 1.6; color: #333; }
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 40px; }
    .info-card { background: #1a365d; color: white; padding: 20px; text-align: center; }
    .info-card label { display: block; font-size: 10px; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px; }
    .info-card span { font-size: 14px; font-weight: 600; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { background: #2d4a6f; color: white; padding: 15px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .items-table td { padding: 15px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .items-table tr:nth-child(even) { background: #f8fafc; }
    .text-right { text-align: right; }
    .totals-section { display: flex; justify-content: flex-end; }
    .totals-box { width: 320px; background: #1a365d; color: white; padding: 25px; }
    .total-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.2); font-size: 14px; }
    .total-row.final { border-top: 2px solid white; border-bottom: none; font-size: 20px; font-weight: bold; margin-top: 10px; }
    .bank-section { margin-top: 40px; padding: 25px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .bank-section h3 { color: #1a365d; font-size: 14px; margin-bottom: 15px; }
    .bank-section p { font-size: 13px; color: #555; line-height: 2; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="top-bar">
      <div class="vendor">${invoiceData.vendorName}</div>
      <div class="doc-type">Tax Invoice</div>
    </div>
    <div class="content-grid">
      <div class="section">
        <h3>Bill To</h3>
        <p><strong>${invoiceData.billTo.companyName}</strong><br>${invoiceData.billTo.address}</p>
      </div>
      <div class="section">
        <h3>Ship To</h3>
        <p><strong>${invoiceData.billTo.companyName}</strong><br>${invoiceData.billTo.address}</p>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-card"><label>Invoice #</label><span>${invoiceData.invoiceNumber}</span></div>
      <div class="info-card"><label>Date</label><span>${formatDate(invoiceData.invoiceDate)}</span></div>
      <div class="info-card"><label>Ref. PO</label><span>${invoiceData.refPO}</span></div>
      <div class="info-card"><label>Currency</label><span>${invoiceData.currency}</span></div>
    </div>
    <table class="items-table">
      <thead><tr><th>Material No.</th><th>Description</th><th>Qty</th><th>Unit</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead>
      <tbody>${invoiceData.lineItems.map(item => `<tr><td>${item.materialNo}</td><td>${item.description}</td><td>${item.qty}</td><td>${item.unit}</td><td class="text-right">${item.price.toFixed(2)}</td><td class="text-right">${calculateLineTotal(item).toFixed(2)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="totals-section">
      <div class="totals-box">
        <div class="total-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
        <div class="total-row"><span>Tax (${invoiceData.taxRate}%)</span><span>${tax.toFixed(2)}</span></div>
        <div class="total-row final"><span>TOTAL ${invoiceData.currency}</span><span>${total.toFixed(2)}</span></div>
      </div>
    </div>
    <div class="bank-section">
      <h3>Payment Information</h3>
      <p><strong>Bank Name:</strong> ${invoiceData.bankDetails.bankName} | <strong>Account Number:</strong> ${invoiceData.bankDetails.account} | <strong>SWIFT Code:</strong> ${invoiceData.bankDetails.swift}</p>
    </div>
  </div>
</body>
</html>`,

      elegant: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Playfair Display', 'Times New Roman', serif; background: linear-gradient(45deg, #f3e7e9 0%, #e3eeff 99%, #e3eeff 100%); padding: 40px; min-height: 100vh; }
    .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 60px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); position: relative; }
    .invoice-container::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #d4af37, #f4e5c2, #d4af37); }
    .header { text-align: center; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 1px solid #e0d5c5; }
    .vendor-name { font-size: 14px; color: #8b7355; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 15px; }
    .invoice-title { font-size: 52px; color: #2c2416; font-weight: 400; font-style: italic; }
    .meta-section { display: flex; justify-content: space-between; margin-bottom: 50px; }
    .bill-to { text-align: left; }
    .bill-to h4 { font-size: 11px; color: #8b7355; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; font-family: sans-serif; }
    .bill-to p { font-size: 16px; color: #2c2416; line-height: 1.8; }
    .invoice-details { text-align: right; }
    .detail-item { margin-bottom: 12px; }
    .detail-item label { font-size: 10px; color: #8b7355; text-transform: uppercase; letter-spacing: 1px; font-family: sans-serif; display: block; margin-bottom: 3px; }
    .detail-item span { font-size: 14px; color: #2c2416; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    .items-table th { padding: 20px 15px; text-align: left; font-size: 11px; color: #8b7355; text-transform: uppercase; letter-spacing: 2px; font-family: sans-serif; font-weight: 400; border-bottom: 2px solid #d4af37; }
    .items-table td { padding: 20px 15px; border-bottom: 1px solid #f0e6d8; font-size: 15px; color: #2c2416; }
    .text-right { text-align: right; }
    .totals { text-align: right; margin-bottom: 40px; }
    .totals-inner { display: inline-block; text-align: left; min-width: 280px; }
    .total-row { display: flex; justify-content: space-between; padding: 12px 0; font-size: 15px; color: #5a4a3a; border-bottom: 1px solid #f0e6d8; }
    .total-row.final { border-top: 3px double #d4af37; border-bottom: 3px double #d4af37; font-size: 22px; color: #2c2416; font-weight: 600; margin-top: 10px; padding: 15px 0; }
    .bank-details { text-align: center; padding-top: 30px; border-top: 1px solid #e0d5c5; }
    .bank-details h4 { font-size: 11px; color: #8b7355; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; font-family: sans-serif; }
    .bank-details p { font-size: 13px; color: #5a4a3a; line-height: 2; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="vendor-name">${invoiceData.vendorName}</div>
      <div class="invoice-title">Invoice</div>
    </div>
    <div class="meta-section">
      <div class="bill-to">
        <h4>Bill To</h4>
        <p><strong style="font-size: 18px;">${invoiceData.billTo.companyName}</strong><br>${invoiceData.billTo.address}</p>
      </div>
      <div class="invoice-details">
        <div class="detail-item"><label>Invoice Number</label><span>${invoiceData.invoiceNumber}</span></div>
        <div class="detail-item"><label>Date</label><span>${formatDate(invoiceData.invoiceDate)}</span></div>
        <div class="detail-item"><label>Reference PO</label><span>${invoiceData.refPO}</span></div>
        <div class="detail-item"><label>Currency</label><span>${invoiceData.currency}</span></div>
      </div>
    </div>
    <table class="items-table">
      <thead><tr><th>Material</th><th>Description</th><th>Quantity</th><th class="text-right">Price</th><th class="text-right">Amount</th></tr></thead>
      <tbody>${invoiceData.lineItems.map(item => `<tr><td>${item.materialNo}</td><td>${item.description}</td><td>${item.qty} ${item.unit}</td><td class="text-right">${item.price.toFixed(2)}</td><td class="text-right">${calculateLineTotal(item).toFixed(2)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="totals">
      <div class="totals-inner">
        <div class="total-row"><span>Subtotal</span><span>${subtotal.toFixed(2)} ${invoiceData.currency}</span></div>
        <div class="total-row"><span>Tax (${invoiceData.taxRate}%)</span><span>${tax.toFixed(2)} ${invoiceData.currency}</span></div>
        <div class="total-row final"><span>Total</span><span>${total.toFixed(2)} ${invoiceData.currency}</span></div>
      </div>
    </div>
    <div class="bank-details">
      <h4>Payment Details</h4>
      <p><strong>Bank:</strong> ${invoiceData.bankDetails.bankName} | <strong>Account:</strong> ${invoiceData.bankDetails.account} | <strong>SWIFT:</strong> ${invoiceData.bankDetails.swift}</p>
    </div>
  </div>
</body>
</html>`,

      corporate: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #e8ecf1; padding: 30px; }
    .invoice-container { max-width: 900px; margin: 0 auto; background: white; }
    .header { background: #0d1b2a; color: white; padding: 40px; display: flex; justify-content: space-between; align-items: center; }
    .header-left .vendor { font-size: 20px; font-weight: 600; margin-bottom: 5px; }
    .header-left .tagline { font-size: 12px; opacity: 0.7; }
    .header-right { text-align: right; }
    .header-right .doc-type { font-size: 36px; font-weight: 300; letter-spacing: 5px; }
    .sub-header { background: #1b263b; color: white; padding: 20px 40px; display: flex; justify-content: space-between; }
    .sub-header-item label { font-size: 10px; text-transform: uppercase; opacity: 0.6; display: block; margin-bottom: 3px; }
    .sub-header-item span { font-size: 14px; font-weight: 500; }
    .content { padding: 40px; }
    .address-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .address-box h4 { font-size: 12px; color: #415a77; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #415a77; }
    .address-box p { font-size: 14px; line-height: 1.8; color: #333; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { background: #415a77; color: white; padding: 15px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .items-table td { padding: 15px; border-bottom: 1px solid #e0e6ed; font-size: 14px; }
    .items-table tr:nth-child(even) { background: #f5f7fa; }
    .text-right { text-align: right; }
    .totals-wrapper { display: flex; justify-content: flex-end; background: #f5f7fa; padding: 30px; margin: 0 -40px -40px -40px; }
    .totals { width: 350px; }
    .total-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #d0d8e0; font-size: 14px; color: #555; }
    .total-row.final { border-top: 3px solid #0d1b2a; border-bottom: none; font-size: 22px; color: #0d1b2a; font-weight: 700; margin-top: 10px; padding-top: 15px; }
    .bank-footer { background: #0d1b2a; color: white; padding: 25px 40px; margin: 40px -40px -40px -40px; }
    .bank-footer h4 { font-size: 11px; text-transform: uppercase; opacity: 0.6; margin-bottom: 10px; }
    .bank-footer p { font-size: 13px; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="header-left">
        <div class="vendor">${invoiceData.vendorName}</div>
        <div class="tagline">Trusted Business Partner</div>
      </div>
      <div class="header-right">
        <div class="doc-type">INVOICE</div>
      </div>
    </div>
    <div class="sub-header">
      <div class="sub-header-item"><label>Invoice #</label><span>${invoiceData.invoiceNumber}</span></div>
      <div class="sub-header-item"><label>Date</label><span>${formatDate(invoiceData.invoiceDate)}</span></div>
      <div class="sub-header-item"><label>Ref. PO</label><span>${invoiceData.refPO}</span></div>
      <div class="sub-header-item"><label>Currency</label><span>${invoiceData.currency}</span></div>
    </div>
    <div class="content">
      <div class="address-section">
        <div class="address-box">
          <h4>Bill To</h4>
          <p><strong>${invoiceData.billTo.companyName}</strong><br>${invoiceData.billTo.address}</p>
        </div>
        <div class="address-box">
          <h4>Payment Terms</h4>
          <p>Net 30 Days<br>Please include invoice number on payment</p>
        </div>
      </div>
      <table class="items-table">
        <thead><tr><th>Material No.</th><th>Description</th><th>Qty</th><th>Unit</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead>
        <tbody>${invoiceData.lineItems.map(item => `<tr><td>${item.materialNo}</td><td>${item.description}</td><td>${item.qty}</td><td>${item.unit}</td><td class="text-right">${item.price.toFixed(2)}</td><td class="text-right">${calculateLineTotal(item).toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>
      <div class="totals-wrapper">
        <div class="totals">
          <div class="total-row"><span>Subtotal</span><span>${subtotal.toFixed(2)} ${invoiceData.currency}</span></div>
          <div class="total-row"><span>Tax (${invoiceData.taxRate}%)</span><span>${tax.toFixed(2)} ${invoiceData.currency}</span></div>
          <div class="total-row final"><span>Amount Due</span><span>${total.toFixed(2)} ${invoiceData.currency}</span></div>
        </div>
      </div>
    </div>
    <div class="bank-footer">
      <h4>Bank Transfer Details</h4>
      <p><strong>Bank:</strong> ${invoiceData.bankDetails.bankName} | <strong>Account:</strong> ${invoiceData.bankDetails.account} | <strong>SWIFT:</strong> ${invoiceData.bankDetails.swift}</p>
    </div>
  </div>
</body>
</html>`,

      simple: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: white; padding: 50px; }
    .invoice { max-width: 700px; margin: 0 auto; }
    h1 { font-size: 36px; margin-bottom: 10px; }
    .vendor { color: #666; margin-bottom: 30px; }
    .info { margin-bottom: 30px; }
    .info-row { display: flex; margin-bottom: 8px; }
    .info-row label { width: 120px; color: #666; }
    .bill-to { margin-bottom: 30px; padding: 20px; background: #f5f5f5; }
    .bill-to h3 { font-size: 14px; color: #666; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #333; color: white; }
    .num { text-align: right; }
    .totals { width: 300px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
    .totals .grand { font-weight: bold; font-size: 18px; border-top: 2px solid #333; border-bottom: 2px solid #333; margin-top: 5px; }
    .bank { margin-top: 40px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="invoice">
    <h1>Invoice</h1>
    <p class="vendor">${invoiceData.vendorName}</p>
    <div class="info">
      <div class="info-row"><label>Invoice #:</label><span>${invoiceData.invoiceNumber}</span></div>
      <div class="info-row"><label>Date:</label><span>${formatDate(invoiceData.invoiceDate)}</span></div>
      <div class="info-row"><label>Ref. PO:</label><span>${invoiceData.refPO}</span></div>
      <div class="info-row"><label>Currency:</label><span>${invoiceData.currency}</span></div>
    </div>
    <div class="bill-to">
      <h3>Bill To:</h3>
      <p><strong>${invoiceData.billTo.companyName}</strong><br>${invoiceData.billTo.address}</p>
    </div>
    <table>
      <thead><tr><th>Item</th><th>Description</th><th>Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
      <tbody>${invoiceData.lineItems.map(item => `<tr><td>${item.materialNo}</td><td>${item.description}</td><td>${item.qty} ${item.unit}</td><td class="num">${item.price.toFixed(2)}</td><td class="num">${calculateLineTotal(item).toFixed(2)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
      <div><span>Tax (${invoiceData.taxRate}%):</span><span>${tax.toFixed(2)}</span></div>
      <div class="grand"><span>Total:</span><span>${total.toFixed(2)} ${invoiceData.currency}</span></div>
    </div>
    <div class="bank">
      <strong>Bank:</strong> ${invoiceData.bankDetails.bankName} | <strong>Account:</strong> ${invoiceData.bankDetails.account} | <strong>SWIFT:</strong> ${invoiceData.bankDetails.swift}
    </div>
  </div>
</body>
</html>`,

      bold: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Impact', 'Arial Black', sans-serif; background: #ff6b6b; padding: 30px; }
    .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 50px; }
    .header { text-align: center; margin-bottom: 40px; }
    .vendor { font-size: 16px; color: #ff6b6b; letter-spacing: 3px; margin-bottom: 10px; }
    .title { font-size: 72px; color: #333; letter-spacing: 8px; }
    .meta-bar { background: #333; color: white; padding: 20px; display: flex; justify-content: space-around; margin-bottom: 40px; }
    .meta-item { text-align: center; }
    .meta-item label { display: block; font-size: 10px; text-transform: uppercase; opacity: 0.6; margin-bottom: 5px; }
    .meta-item span { font-size: 18px; font-weight: bold; }
    .bill-to { text-align: center; margin-bottom: 40px; padding: 30px; background: #f8f8f8; }
    .bill-to h3 { font-size: 14px; color: #ff6b6b; margin-bottom: 15px; }
    .bill-to p { font-size: 20px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { background: #ff6b6b; color: white; padding: 18px; text-align: left; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }
    .items-table td { padding: 18px; border-bottom: 3px solid #eee; font-size: 16px; }
    .num { text-align: right; }
    .totals { background: #333; color: white; padding: 30px; }
    .totals-row { display: flex; justify-content: space-between; padding: 15px 0; font-size: 18px; border-bottom: 1px solid #555; }
    .totals-row.final { font-size: 32px; border-top: 4px solid #ff6b6b; border-bottom: none; margin-top: 10px; padding-top: 20px; }
    .bank { text-align: center; margin-top: 30px; padding-top: 30px; border-top: 4px solid #ff6b6b; }
    .bank p { font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="vendor">${invoiceData.vendorName}</div>
      <div class="title">INVOICE</div>
    </div>
    <div class="meta-bar">
      <div class="meta-item"><label>Invoice #</label><span>${invoiceData.invoiceNumber}</span></div>
      <div class="meta-item"><label>Date</label><span>${formatDate(invoiceData.invoiceDate)}</span></div>
      <div class="meta-item"><label>Ref. PO</label><span>${invoiceData.refPO}</span></div>
      <div class="meta-item"><label>Currency</label><span>${invoiceData.currency}</span></div>
    </div>
    <div class="bill-to">
      <h3>BILL TO</h3>
      <p><strong>${invoiceData.billTo.companyName}</strong><br>${invoiceData.billTo.address}</p>
    </div>
    <table class="items-table">
      <thead><tr><th>Material</th><th>Description</th><th>Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
      <tbody>${invoiceData.lineItems.map(item => `<tr><td>${item.materialNo}</td><td>${item.description}</td><td>${item.qty} ${item.unit}</td><td class="num">${item.price.toFixed(2)}</td><td class="num">${calculateLineTotal(item).toFixed(2)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>SUBTOTAL</span><span>${subtotal.toFixed(2)} ${invoiceData.currency}</span></div>
      <div class="totals-row"><span>TAX (${invoiceData.taxRate}%)</span><span>${tax.toFixed(2)} ${invoiceData.currency}</span></div>
      <div class="totals-row final"><span>TOTAL</span><span>${total.toFixed(2)} ${invoiceData.currency}</span></div>
    </div>
    <div class="bank">
      <p><strong>BANK:</strong> ${invoiceData.bankDetails.bankName} | <strong>ACCOUNT:</strong> ${invoiceData.bankDetails.account} | <strong>SWIFT:</strong> ${invoiceData.bankDetails.swift}</p>
    </div>
  </div>
</body>
</html>`,

      compact: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: white; padding: 20px; font-size: 12px; }
    .invoice { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
    .header-left .vendor { font-size: 11px; color: #666; }
    .header-left .title { font-size: 28px; font-weight: bold; }
    .header-right { text-align: right; font-size: 11px; }
    .header-right div { margin-bottom: 3px; }
    .bill-to { margin-bottom: 20px; }
    .bill-to h4 { font-size: 9px; text-transform: uppercase; color: #666; margin-bottom: 5px; }
    .bill-to p { font-size: 12px; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: 600; }
    .num { text-align: right; }
    .totals { width: 250px; margin-left: auto; font-size: 11px; }
    .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
    .totals .final { font-weight: bold; font-size: 14px; border-top: 2px solid #333; margin-top: 5px; padding-top: 8px; }
    .bank { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="header-left">
        <div class="vendor">${invoiceData.vendorName}</div>
        <div class="title">INVOICE</div>
      </div>
      <div class="header-right">
        <div><strong>#</strong> ${invoiceData.invoiceNumber}</div>
        <div><strong>Date:</strong> ${formatDate(invoiceData.invoiceDate)}</div>
        <div><strong>PO:</strong> ${invoiceData.refPO}</div>
        <div><strong>Currency:</strong> ${invoiceData.currency}</div>
      </div>
    </div>
    <div class="bill-to">
      <h4>Bill To</h4>
      <p><strong>${invoiceData.billTo.companyName}</strong><br>${invoiceData.billTo.address}</p>
    </div>
    <table>
      <thead><tr><th>Material</th><th>Description</th><th>Qty</th><th>Unit</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
      <tbody>${invoiceData.lineItems.map(item => `<tr><td>${item.materialNo}</td><td>${item.description}</td><td>${item.qty}</td><td>${item.unit}</td><td class="num">${item.price.toFixed(2)}</td><td class="num">${calculateLineTotal(item).toFixed(2)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
      <div><span>Tax (${invoiceData.taxRate}%):</span><span>${tax.toFixed(2)}</span></div>
      <div class="final"><span>TOTAL</span><span>${total.toFixed(2)} ${invoiceData.currency}</span></div>
    </div>
    <div class="bank">
      Bank: ${invoiceData.bankDetails.bankName} | Account: ${invoiceData.bankDetails.account} | SWIFT: ${invoiceData.bankDetails.swift}
    </div>
  </div>
</body>
</html>`,

      premium: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Montserrat', 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; min-height: 100vh; }
    .invoice-container { max-width: 850px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 80px rgba(0,0,0,0.4); }
    .top-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 50px; position: relative; }
    .top-section::after { content: ''; position: absolute; bottom: -50px; left: 0; right: 0; height: 100px; background: white; border-radius: 50% 50% 0 0; }
    .header-content { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
    .vendor-info .vendor { font-size: 14px; opacity: 0.8; letter-spacing: 2px; margin-bottom: 10px; }
    .vendor-info .title { font-size: 48px; font-weight: 300; letter-spacing: 4px; }
    .invoice-badge { background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 20px 30px; border-radius: 15px; text-align: center; }
    .invoice-badge .number { font-size: 24px; font-weight: 600; }
    .invoice-badge .label { font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 2px; }
    .content { padding: 60px 50px 40px; position: relative; z-index: 1; }
    .meta-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
    .meta-card { background: #f8f9fa; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #e9ecef; }
    .meta-card label { display: block; font-size: 10px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .meta-card span { font-size: 14px; color: #333; font-weight: 600; }
    .bill-to-section { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 15px; margin-bottom: 40px; }
    .bill-to-section h4 { font-size: 11px; color: #6c757d; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; }
    .bill-to-section p { font-size: 18px; color: #333; line-height: 1.6; }
    .items-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; }
    .items-table th { background: #495057; color: white; padding: 18px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .items-table th:first-child { border-radius: 12px 0 0 0; }
    .items-table th:last-child { border-radius: 0 12px 0 0; }
    .items-table td { padding: 18px; border-bottom: 1px solid #e9ecef; font-size: 14px; }
    .items-table tr:hover { background: #f8f9fa; }
    .num { text-align: right; }
    .totals-section { display: flex; justify-content: flex-end; }
    .totals-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; width: 350px; }
    .total-line { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.2); font-size: 14px; }
    .total-line.final { border-top: 2px solid white; border-bottom: none; font-size: 24px; font-weight: 600; margin-top: 10px; padding-top: 15px; }
    .bank-section { margin-top: 40px; padding: 25px; background: #f8f9fa; border-radius: 12px; text-align: center; }
    .bank-section h4 { font-size: 11px; color: #6c757d; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; }
    .bank-section p { font-size: 13px; color: #495057; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="top-section">
      <div class="header-content">
        <div class="vendor-info">
          <div class="vendor">${invoiceData.vendorName}</div>
          <div class="title">Invoice</div>
        </div>
        <div class="invoice-badge">
          <div class="number">${invoiceData.invoiceNumber}</div>
          <div class="label">Invoice Number</div>
        </div>
      </div>
    </div>
    <div class="content">
      <div class="meta-cards">
        <div class="meta-card"><label>Invoice Date</label><span>${formatDate(invoiceData.invoiceDate)}</span></div>
        <div class="meta-card"><label>Reference PO</label><span>${invoiceData.refPO}</span></div>
        <div class="meta-card"><label>Currency</label><span>${invoiceData.currency}</span></div>
        <div class="meta-card"><label>Tax Rate</label><span>${invoiceData.taxRate}%</span></div>
      </div>
      <div class="bill-to-section">
        <h4>Bill To</h4>
        <p><strong>${invoiceData.billTo.companyName}</strong><br>${invoiceData.billTo.address}</p>
      </div>
      <table class="items-table">
        <thead><tr><th>Material No.</th><th>Description</th><th>Qty</th><th>Unit</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
        <tbody>${invoiceData.lineItems.map(item => `<tr><td>${item.materialNo}</td><td>${item.description}</td><td>${item.qty}</td><td>${item.unit}</td><td class="num">${item.price.toFixed(2)}</td><td class="num">${calculateLineTotal(item).toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>
      <div class="totals-section">
        <div class="totals-card">
          <div class="total-line"><span>Subtotal</span><span>${subtotal.toFixed(2)} ${invoiceData.currency}</span></div>
          <div class="total-line"><span>Tax (${invoiceData.taxRate}%)</span><span>${tax.toFixed(2)} ${invoiceData.currency}</span></div>
          <div class="total-line final"><span>Total</span><span>${total.toFixed(2)} ${invoiceData.currency}</span></div>
        </div>
      </div>
      <div class="bank-section">
        <h4>Payment Information</h4>
        <p><strong>Bank:</strong> ${invoiceData.bankDetails.bankName} | <strong>Account:</strong> ${invoiceData.bankDetails.account} | <strong>SWIFT:</strong> ${invoiceData.bankDetails.swift}</p>
      </div>
    </div>
  </div>
</body>
</html>`
    };

    return templates[selectedTemplate];
  };

  const handleGenerateHTML = () => {
    const htmlContent = generateInvoiceHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${invoiceData.invoiceNumber}_${selectedTemplate}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    });

    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const total = calculateTotal();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Template-specific PDF generation
    switch (selectedTemplate) {
      case 'modern':
        // Gradient header effect with colored header
        doc.setFillColor(102, 126, 234);
        doc.rect(0, 0, pageWidth, 50, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(invoiceData.vendorName, margin, 20);
        doc.setFontSize(30);
        doc.text('INVOICE', pageWidth - margin - 40, 30, { align: 'right' });
        
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(10);
        doc.text('Bill To:', margin, 65);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(invoiceData.billTo.companyName, margin, 72);
        doc.setFontSize(10);
        doc.text(invoiceData.billTo.address, margin, 78);
        
        doc.setTextColor(80, 80, 80);
        doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, pageWidth - margin - 50, 65);
        doc.text(`Date: ${formatDate(invoiceData.invoiceDate)}`, pageWidth - margin - 50, 71);
        doc.text(`Ref. PO: ${invoiceData.refPO}`, pageWidth - margin - 50, 77);
        doc.text(`Currency: ${invoiceData.currency}`, pageWidth - margin - 50, 83);
        break;

      case 'minimal':
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(invoiceData.vendorName, margin, 25);
        doc.setFontSize(36);
        doc.setTextColor(0, 0, 0);
        doc.text('Invoice', margin, 40);
        
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('BILL TO', margin, 60);
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(invoiceData.billTo.companyName, margin, 67);
        doc.text(invoiceData.billTo.address, margin, 73);
        
        doc.setTextColor(100, 100, 100);
        doc.text(`# ${invoiceData.invoiceNumber}`, pageWidth - margin, 60, { align: 'right' });
        doc.text(`Date ${formatDate(invoiceData.invoiceDate)}`, pageWidth - margin, 66, { align: 'right' });
        doc.text(`PO ${invoiceData.refPO}`, pageWidth - margin, 72, { align: 'right' });
        doc.text(`Currency ${invoiceData.currency}`, pageWidth - margin, 78, { align: 'right' });
        break;

      case 'bold':
        doc.setFillColor(255, 107, 107);
        doc.rect(0, 0, pageWidth, 15, 'F');
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 15, pageWidth, 100, 'F');
        
        doc.setTextColor(255, 107, 107);
        doc.setFontSize(12);
        doc.text(invoiceData.vendorName, margin, 35);
        doc.setFontSize(48);
        doc.setTextColor(50, 50, 50);
        doc.text('INVOICE', margin, 60);
        
        doc.setFillColor(50, 50, 50);
        doc.rect(margin, 75, contentWidth, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        const colWidth = contentWidth / 4;
        doc.text(`Inv: ${invoiceData.invoiceNumber}`, margin + 5, 87);
        doc.text(`Date: ${formatDate(invoiceData.invoiceDate)}`, margin + colWidth + 5, 87);
        doc.text(`PO: ${invoiceData.refPO}`, margin + colWidth * 2 + 5, 87);
        doc.text(`Curr: ${invoiceData.currency}`, margin + colWidth * 3 + 5, 87);
        break;

      case 'premium':
        doc.setFillColor(102, 126, 234);
        doc.rect(0, 0, pageWidth, 60, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(invoiceData.vendorName, margin, 25);
        doc.setFontSize(32);
        doc.text('Invoice', margin, 45);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(pageWidth - margin - 50, 20, 45, 25, 5, 5, 'FD');
        doc.setTextColor(102, 126, 234);
        doc.setFontSize(14);
        doc.text(invoiceData.invoiceNumber, pageWidth - margin - 27, 35, { align: 'center' });
        break;

      default: // classic and others
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(invoiceData.vendorName, margin, 25);
        doc.setFontSize(28);
        doc.setTextColor(0, 0, 0);
        doc.text('INVOICE', pageWidth - margin, 30, { align: 'right' });
        
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, 40, pageWidth - margin, 40);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Bill To:', margin, 55);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(invoiceData.billTo.companyName, margin, 62);
        doc.setFontSize(10);
        doc.text(invoiceData.billTo.address, margin, 68);
        
        doc.setTextColor(80, 80, 80);
        doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, pageWidth - margin, 55, { align: 'right' });
        doc.text(`Date: ${formatDate(invoiceData.invoiceDate)}`, pageWidth - margin, 61, { align: 'right' });
        doc.text(`Ref. PO: ${invoiceData.refPO}`, pageWidth - margin, 67, { align: 'right' });
        doc.text(`Currency: ${invoiceData.currency}`, pageWidth - margin, 73, { align: 'right' });
    }

    // Table
    const tableData = invoiceData.lineItems.map(item => [
      item.materialNo,
      item.description,
      item.qty.toString(),
      item.unit,
      `${item.price.toFixed(2)}`,
      `${calculateLineTotal(item).toFixed(2)}`
    ]);

    const tableStartY = selectedTemplate === 'bold' ? 105 : 85;

    autoTable(doc, {
      startY: tableStartY,
      head: [['Material No.', 'Description', 'Qty', 'Unit', 'Price', 'Total']],
      body: tableData,
      theme: selectedTemplate === 'modern' ? 'grid' : 'striped',
      headStyles: {
        fillColor: selectedTemplate === 'modern' ? [102, 126, 234] : selectedTemplate === 'bold' ? [255, 107, 107] : [50, 50, 50],
        textColor: 255,
        fontSize: 10
      },
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    // Totals
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    const totalsX = pageWidth - margin - 70;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('Subtotal:', totalsX, finalY);
    doc.text(`${subtotal.toFixed(2)} ${invoiceData.currency}`, pageWidth - margin, finalY, { align: 'right' });
    
    doc.text(`Tax (${invoiceData.taxRate}%):`, totalsX, finalY + 7);
    doc.text(`${tax.toFixed(2)} ${invoiceData.currency}`, pageWidth - margin, finalY + 7, { align: 'right' });
    
    doc.setDrawColor(150, 150, 150);
    doc.line(totalsX, finalY + 12, pageWidth - margin, finalY + 12);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL:', totalsX, finalY + 20);
    doc.text(`${total.toFixed(2)} ${invoiceData.currency}`, pageWidth - margin, finalY + 20, { align: 'right' });

    // Bank details
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Bank Details:', margin, finalY + 35);
    doc.text(`Bank: ${invoiceData.bankDetails.bankName} | Account: ${invoiceData.bankDetails.account} | SWIFT: ${invoiceData.bankDetails.swift}`, margin, finalY + 42);

    doc.save(`Invoice_${invoiceData.invoiceNumber}_${selectedTemplate}.pdf`);
  };

  const getPreviewStyles = () => {
    switch (selectedTemplate) {
      case 'modern':
        return 'preview-modern';
      case 'minimal':
        return 'preview-minimal';
      case 'professional':
        return 'preview-professional';
      case 'elegant':
        return 'preview-elegant';
      case 'corporate':
        return 'preview-corporate';
      case 'simple':
        return 'preview-simple';
      case 'bold':
        return 'preview-bold';
      case 'compact':
        return 'preview-compact';
      case 'premium':
        return 'preview-premium';
      default:
        return 'preview-classic';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FileText className="w-8 h-8" />
            Invoice Generator
          </h1>
          <p className="text-gray-600 mt-2">Fill in the form below to generate your invoice</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template" className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" />
                  Invoice Template
                </Label>
                <Select value={selectedTemplate} onValueChange={(value) => setSelectedTemplate(value as InvoiceTemplate)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} - {template.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor Name */}
              <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor / Company Name</Label>
                <Input
                  id="vendorName"
                  value={invoiceData.vendorName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, vendorName: e.target.value }))}
                />
              </div>

              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice #</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceData.invoiceNumber}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceDate">Invoice Date</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={invoiceData.invoiceDate}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Bill To */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Bill To (Company Name)</Label>
                <Input
                  id="companyName"
                  value={invoiceData.billTo.companyName}
                  onChange={(e) => setInvoiceData(prev => ({ 
                    ...prev, 
                    billTo: { ...prev.billTo, companyName: e.target.value }
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={invoiceData.billTo.address}
                  onChange={(e) => setInvoiceData(prev => ({ 
                    ...prev, 
                    billTo: { ...prev.billTo, address: e.target.value }
                  }))}
                />
              </div>

              {/* Reference & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refPO">Ref. PO</Label>
                  <Input
                    id="refPO"
                    value={invoiceData.refPO}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, refPO: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={invoiceData.currency}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, currency: e.target.value }))}
                  />
                </div>
              </div>

              {/* Tax Rate */}
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={invoiceData.taxRate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Material Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                {invoiceData.lineItems.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Item #{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        disabled={invoiceData.lineItems.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Material No."
                        value={item.materialNo}
                        onChange={(e) => updateLineItem(item.id, 'materialNo', e.target.value)}
                      />
                      <Input
                        placeholder="Unit"
                        value={item.unit}
                        onChange={(e) => updateLineItem(item.id, 'unit', e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={item.qty}
                        onChange={(e) => updateLineItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => updateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      Line Total: <span className="font-semibold">{calculateLineTotal(item).toFixed(2)} {invoiceData.currency}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bank Details */}
              <div className="space-y-4 pt-4 border-t">
                <Label>Bank Details</Label>
                <div className="grid grid-cols-1 gap-3">
                  <Input
                    placeholder="Bank Name"
                    value={invoiceData.bankDetails.bankName}
                    onChange={(e) => setInvoiceData(prev => ({ 
                      ...prev, 
                      bankDetails: { ...prev.bankDetails, bankName: e.target.value }
                    }))}
                  />
                  <Input
                    placeholder="Account Number"
                    value={invoiceData.bankDetails.account}
                    onChange={(e) => setInvoiceData(prev => ({ 
                      ...prev, 
                      bankDetails: { ...prev.bankDetails, account: e.target.value }
                    }))}
                  />
                  <Input
                    placeholder="SWIFT Code"
                    value={invoiceData.bankDetails.swift}
                    onChange={(e) => setInvoiceData(prev => ({ 
                      ...prev, 
                      bankDetails: { ...prev.bankDetails, swift: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Invoice Preview ({invoiceTemplates.find(t => t.id === selectedTemplate)?.name})</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleGenerateHTML} variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    HTML
                  </Button>
                  <Button onClick={handleGeneratePDF} className="gap-2">
                    <FileDown className="w-4 h-4" />
                    PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={invoiceRef} className={`invoice-preview bg-white p-6 border rounded-lg ${getPreviewStyles()}`}>
                  <div className="preview-header">
                    <div className="company-info">
                      <p className="text-xs text-gray-500">{invoiceData.vendorName}</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl font-bold">INVOICE</h2>
                    </div>
                  </div>

                  <div className="preview-meta">
                    <div className="bill-to">
                      <p className="text-xs text-gray-500 uppercase">Bill To:</p>
                      <p className="font-semibold">{invoiceData.billTo.companyName}</p>
                      <p className="text-sm text-gray-600">{invoiceData.billTo.address}</p>
                    </div>
                    <div className="invoice-info">
                      <div className="info-row">
                        <span className="text-gray-600">Invoice #</span>
                        <span className="font-semibold">{invoiceData.invoiceNumber}</span>
                      </div>
                      <div className="info-row">
                        <span className="text-gray-600">Invoice Date</span>
                        <span>{formatDate(invoiceData.invoiceDate)}</span>
                      </div>
                      <div className="info-row">
                        <span className="text-gray-600">Ref. PO</span>
                        <span>{invoiceData.refPO}</span>
                      </div>
                      <div className="info-row">
                        <span className="text-gray-600">Currency</span>
                        <span>{invoiceData.currency}</span>
                      </div>
                    </div>
                  </div>

                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Material No.</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th className="text-right">Price</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.lineItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.materialNo}</td>
                          <td>{item.description}</td>
                          <td>{item.qty}</td>
                          <td>{item.unit}</td>
                          <td className="text-right">{item.price.toFixed(2)}</td>
                          <td className="text-right">{calculateLineTotal(item).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="preview-totals">
                    <div className="total-row">
                      <span>Subtotal</span>
                      <span>{calculateSubtotal().toFixed(2)} {invoiceData.currency}</span>
                    </div>
                    <div className="total-row">
                      <span>Tax ({invoiceData.taxRate}%)</span>
                      <span>{calculateTax().toFixed(2)} {invoiceData.currency}</span>
                    </div>
                    <div className="total-row final">
                      <span>TOTAL</span>
                      <span>{calculateTotal().toFixed(2)} {invoiceData.currency}</span>
                    </div>
                  </div>

                  <div className="preview-bank">
                    <p className="text-xs text-gray-500 uppercase mb-2">Bank Details:</p>
                    <p className="text-sm"><strong>Bank Name:</strong> {invoiceData.bankDetails.bankName}</p>
                    <p className="text-sm"><strong>Account:</strong> {invoiceData.bankDetails.account}</p>
                    <p className="text-sm"><strong>SWIFT:</strong> {invoiceData.bankDetails.swift}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
