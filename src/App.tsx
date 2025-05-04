import React, { useState, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

type CellData = (string | number)[][];
type WorkbookType = XLSX.WorkBook;
type WorksheetType = XLSX.WorkSheet;

function App() {
  const [data, setData] = useState<CellData>([]);
  const [fileName, setFileName] = useState<string>('');
  const [originalWorkbook, setOriginalWorkbook] = useState<WorkbookType | null>(null);
  const [originalWorksheet, setOriginalWorksheet] = useState<WorksheetType | null>(null);
  const [workbookStyles, setWorkbookStyles] = useState<any>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const wb = XLSX.read(bstr, { 
        type: 'binary',
        cellStyles: true,
        cellFormula: true,
        cellDates: true,
        cellNF: true,
        cellHTML: true,
        sheetStubs: true,
        bookVBA: true,
        bookFiles: true,
        sheets: true,
        numbers: true
      });
      
      setOriginalWorkbook(wb);
      
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      setOriginalWorksheet(ws);
      
      // Store workbook styles
      setWorkbookStyles({
        Styles: wb.Styles,
        themes: wb.Themes,
        vbaraw: wb.vbaraw,
        bookFiles: wb.bookFiles,
        numbers: wb.numbers
      });
      
      const data = XLSX.utils.sheet_to_json(ws, { 
        header: 1,
        raw: false,
        dateNF: 'yyyy-mm-dd',
        defval: ''
      }) as CellData;
      setData(data);
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleCellChange = useCallback((rowIndex: number, colIndex: number, value: string) => {
    setData(prev => {
      const newData = [...prev];
      newData[rowIndex] = [...(newData[rowIndex] || [])];
      newData[rowIndex][colIndex] = value;
      return newData;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!originalWorkbook || !originalWorksheet || !workbookStyles) return;

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Restore workbook properties
    wb.Styles = workbookStyles.Styles;
    wb.Themes = workbookStyles.themes;
    wb.vbaraw = workbookStyles.vbaraw;
    wb.bookFiles = workbookStyles.bookFiles;
    wb.numbers = workbookStyles.numbers;

    // Create new worksheet with updated data
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Copy all worksheet properties and metadata
    ws['!merges'] = originalWorksheet['!merges'];
    ws['!cols'] = originalWorksheet['!cols'];
    ws['!rows'] = originalWorksheet['!rows'];
    ws['!margins'] = originalWorksheet['!margins'];
    ws['!outline'] = originalWorksheet['!outline'];
    ws['!protect'] = originalWorksheet['!protect'];
    ws['!autofilter'] = originalWorksheet['!autofilter'];
    ws['!images'] = originalWorksheet['!images'];
    ws['!drawing'] = originalWorksheet['!drawing'];
    ws['!comments'] = originalWorksheet['!comments'];
    ws['!pivotTables'] = originalWorksheet['!pivotTables'];
    ws['!headerFooter'] = originalWorksheet['!headerFooter'];

    // Preserve cell properties
    Object.keys(originalWorksheet).forEach(key => {
      if (key[0] !== '!') {
        const originalCell = originalWorksheet[key];
        if (ws[key]) {
          // Keep original cell properties while updating value
          const newValue = ws[key].v;
          ws[key] = { ...originalCell, v: newValue };
        } else {
          ws[key] = originalCell;
        }
      }
    });

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Write the workbook with all formatting preserved
    const wbout = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'binary',
      cellStyles: true,
      compression: true,
      bookSST: false,
      bookVBA: true,
      numbers: workbookStyles.numbers
    });

    // Convert to blob and save
    const buf = new ArrayBuffer(wbout.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < wbout.length; i++) {
      view[i] = wbout.charCodeAt(i) & 0xFF;
    }

    saveAs(new Blob([buf], { type: 'application/octet-stream' }), fileName || 'spreadsheet.xlsx');
  }, [data, fileName, originalWorkbook, originalWorksheet, workbookStyles]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white font-mono">
      {/* CRT Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-scanlines"></div>

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 animate-glow">
            RetroSheet Editor
          </h1>
          <p className="text-cyan-300 mb-8">Upload, Edit, and Save Excel Files</p>

          <div className="flex justify-center gap-4 mb-8">
            <label className="retro-button flex items-center gap-2 cursor-pointer">
              <Upload size={20} />
              Upload File
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {data.length > 0 && (
              <button
                onClick={handleSave}
                className="retro-button flex items-center gap-2"
              >
                <Download size={20} />
                Save File
              </button>
            )}
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-cyan-500 rounded-lg bg-opacity-10 bg-black">
            <FileSpreadsheet size={48} className="text-cyan-400 mb-4" />
            <p className="text-cyan-300">Upload an Excel file to begin editing</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full retro-table">
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, colIndex) => (
                      <td key={colIndex} className="p-2 border border-cyan-800">
                        <input
                          type="text"
                          value={cell?.toString() || ''}
                          onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                          className="w-full bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 p-1"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;