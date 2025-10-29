
import React, { useState } from 'react';
import { Book } from '../types';
import { CloseIcon } from './icons';

declare const jspdf: any;

interface ExportModalProps {
  books: Book[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ books, onClose }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const formatLibrary = (books: Book[]): string => {
    return books.map(book => `${book.title} by ${book.authors.join(', ')}`).join('\n');
  };

  const handleExportTxt = () => {
    const content = formatLibrary(books);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-library.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('My Personal Library', 14, 22);
    doc.setFontSize(11);
    
    const lines = books.map(book => `${book.title} by ${book.authors.join(', ')}`);
    doc.text(lines, 14, 32);

    doc.save('my-library.pdf');
  };

  const handleCopyToClipboard = () => {
    const content = formatLibrary(books);
    navigator.clipboard.writeText(content).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors">
          <CloseIcon />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-text-primary">Export Library</h2>
        <div className="space-y-4">
          <button onClick={handleExportTxt} className="w-full text-left bg-gray-700 hover:bg-gray-600 text-text-primary font-medium py-3 px-4 rounded-lg transition-colors">
            Export as .TXT
          </button>
          <button onClick={handleExportPdf} className="w-full text-left bg-gray-700 hover:bg-gray-600 text-text-primary font-medium py-3 px-4 rounded-lg transition-colors">
            Export as .PDF
          </button>
          <button onClick={handleCopyToClipboard} className="w-full text-left bg-gray-700 hover:bg-gray-600 text-text-primary font-medium py-3 px-4 rounded-lg transition-colors">
            {copyStatus === 'copied' ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
};
