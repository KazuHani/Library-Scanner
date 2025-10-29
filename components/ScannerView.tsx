import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Book } from '../types';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { CloseIcon, SpinnerIcon } from './icons';

interface ScannerViewProps {
  onClose: () => void;
  onSave: (books: Book[]) => void;
}

const API_URL = 'https://www.googleapis.com/books/v1/volumes?q=isbn:';

const StagedBookCard: React.FC<{ book: Book }> = ({ book }) => (
    <div className="flex-shrink-0 w-24 h-40 bg-surface rounded-lg overflow-hidden shadow-md flex flex-col items-center p-1 text-center">
        {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="w-full h-28 object-cover rounded-sm"/>
        ) : (
             <div className="w-full h-28 bg-gray-700 flex items-center justify-center">
                <span className="text-3xl text-gray-500">?</span>
            </div>
        )}
        <p className="text-xs font-semibold mt-1 text-text-primary truncate w-full">{book.title}</p>
    </div>
);

export const ScannerView: React.FC<ScannerViewProps> = ({ onClose, onSave }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stagedBooks, setStagedBooks] = useState<Map<string, Book>>(new Map());
    const [isFetching, setIsFetching] = useState<Set<string>>(new Set());
    const [scanHighlight, setScanHighlight] = useState(false);

    const handleIsbnDetected = useCallback(async (isbn: string) => {
        if (isFetching.has(isbn) || stagedBooks.has(isbn)) {
            return;
        }

        setScanHighlight(true);
        setTimeout(() => setScanHighlight(false), 300);

        setIsFetching(prev => new Set(prev).add(isbn));
        try {
            const response = await fetch(`${API_URL}${isbn}`);
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                const item = data.items[0].volumeInfo;
                const newBook: Book = {
                    id: isbn,
                    title: item.title,
                    authors: item.authors || ['Unknown Author'],
                    coverUrl: item.imageLinks?.thumbnail || item.imageLinks?.smallThumbnail,
                };
                setStagedBooks(prev => new Map(prev).set(isbn, newBook));
            }
        } catch (error) {
            console.error('Error fetching book data:', error);
        } finally {
            setIsFetching(prev => {
                const next = new Set(prev);
                next.delete(isbn);
                return next;
            });
        }
    }, [isFetching, stagedBooks]);

    const { error, startScanner, stopScanner } = useBarcodeScanner({ onIsbnDetected: handleIsbnDetected, videoRef });
    
    useEffect(() => {
        startScanner();
        return () => stopScanner();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = () => {
        onSave(Array.from(stagedBooks.values()));
    }

    return (
        <div className="fixed inset-0 bg-background flex flex-col">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline />
            {scanHighlight && <div className="absolute inset-0 bg-white bg-opacity-25 pointer-events-none"></div>}

            <div className="absolute inset-0 flex flex-col justify-between p-4 bg-black bg-opacity-40">
                <header className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white shadow-lg">Scan Books</h2>
                    <button onClick={onClose} className="bg-black bg-opacity-50 rounded-full p-2 text-white">
                        <CloseIcon />
                    </button>
                </header>

                {error && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white p-4 rounded-lg">{error}</div>}

                <footer className="flex flex-col gap-4">
                    <div className="w-full">
                        {isFetching.size > 0 && (
                            <div className="flex items-center justify-center mb-2">
                                <SpinnerIcon />
                                <span className="ml-2 text-white font-medium">Searching for book...</span>
                            </div>
                        )}
                        {stagedBooks.size > 0 &&
                         <div className="relative h-44">
                            <div className="absolute bottom-0 left-0 w-full flex gap-3 overflow-x-auto pb-2">
                                {/* Fix: Explicitly type 'book' to resolve type inference issue. */}
                                {Array.from(stagedBooks.values()).map((book: Book) => <StagedBookCard key={book.id} book={book} />)}
                            </div>
                         </div>
                        }
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={stagedBooks.size === 0}
                        className="w-full bg-secondary text-background font-bold py-4 rounded-lg shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        Add {stagedBooks.size > 0 ? `${stagedBooks.size} Book${stagedBooks.size > 1 ? 's' : ''}` : ''} to Library
                    </button>
                </footer>
            </div>
        </div>
    );
};