import React, { useState, useEffect, useCallback } from 'react';
import { Book, View } from './types';
import { firestoreService } from './services/firestoreService';
import { LibraryView } from './components/LibraryView';
import { ScannerView } from './components/ScannerView';
import { ExportModal } from './components/ExportModal';
import { SpinnerIcon } from './components/icons';

const App: React.FC = () => {
  const [view, setView] = useState<View>('library');
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const books = await firestoreService.getBooks();
      setLibraryBooks(books);
    } catch (error) {
      console.error("Failed to load library", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  useEffect(() => {
    const handleShowScanner = () => {
      setView('scanner');
    };
    window.addEventListener('showScannerView', handleShowScanner);
    return () => {
      window.removeEventListener('showScannerView', handleShowScanner);
    };
  }, []);

  const handleSaveBooks = async (books: Book[]) => {
    await firestoreService.addBooks(books);
    await fetchLibrary();
    setView('library');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <SpinnerIcon />
        <span className="ml-3 text-lg">Loading Library...</span>
      </div>
    );
  }
  
  return (
    <div>
      {view === 'library' && (
        <LibraryView 
            books={libraryBooks} 
            onExportClick={() => setIsExportModalOpen(true)}
        />
      )}
      {view === 'scanner' && (
        <ScannerView
          onClose={() => setView('library')}
          onSave={handleSaveBooks}
        />
      )}
      {isExportModalOpen && (
        <ExportModal books={libraryBooks} onClose={() => setIsExportModalOpen(false)} />
      )}
    </div>
  );
};

export default App;