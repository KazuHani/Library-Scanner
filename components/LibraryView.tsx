
import React from 'react';
import { Book } from '../types';
import { PlusIcon, BookOpenIcon, ExportIcon } from './icons';

interface LibraryViewProps {
  books: Book[];
  onAddClick: () => void;
  onExportClick: () => void;
}

const BookCover: React.FC<{ book: Book }> = ({ book }) => (
  <div className="aspect-[2/3] bg-surface rounded-md overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300 group">
    {book.coverUrl ? (
      <img src={book.coverUrl} alt={`Cover of ${book.title}`} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gray-800">
        <BookOpenIcon />
        <p className="text-sm font-bold mt-2 text-text-primary">{book.title}</p>
        <p className="text-xs text-text-secondary">{book.authors.join(', ')}</p>
      </div>
    )}
  </div>
);

export const LibraryView: React.FC<LibraryViewProps> = ({ books, onAddClick, onExportClick }) => {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">My Library</h1>
        {books.length > 0 && (
            <button onClick={onExportClick} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-full transition-colors">
                <ExportIcon />
                <span className="hidden sm:inline">Export</span>
            </button>
        )}
      </header>

      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center text-text-secondary" style={{height: '70vh'}}>
          <BookOpenIcon />
          <p className="mt-4 text-lg">Your library is empty.</p>
          <p>Click the '+' button to start scanning books.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {books.map(book => (
            <BookCover key={book.id} book={book} />
          ))}
        </div>
      )}

      <button
        onClick={onAddClick}
        className="fixed bottom-6 right-6 bg-secondary text-background h-16 w-16 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform"
        aria-label="Add new books"
      >
        <PlusIcon />
      </button>
    </div>
  );
};
