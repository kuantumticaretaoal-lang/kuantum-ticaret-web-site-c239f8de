import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  if (!data || data.length === 0) {
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  const timestamp = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
  XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
};

export const formatDateForExport = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('tr-TR');
};

export const formatCurrencyForExport = (amount: number | string) => {
  return `${parseFloat(String(amount)).toFixed(2)} ₺`;
};
