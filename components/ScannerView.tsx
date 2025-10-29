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
    const [manualIsbn, setManualIsbn] = useState('');

    const handleIsbnDetected = useCallback(async (isbn: string) => {
        const cleanedIsbn = isbn.replace(/[-\s]/g, '');
        if (isFetching.has(cleanedIsbn) || stagedBooks.has(cleanedIsbn)) {
            return;
        }

        setScanHighlight(true);
        setTimeout(() => setScanHighlight(false), 300);

        setIsFetching(prev => new Set(prev).add(cleanedIsbn));
        try {
            const response = await fetch(`${API_URL}${cleanedIsbn}`);
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                const item = data.items[0].volumeInfo;
                const newBook: Book = {
                    id: cleanedIsbn,
                    title: item.title,
                    authors: item.authors || ['Unknown Author'],
                    coverUrl: item.imageLinks?.thumbnail || item.imageLinks?.smallThumbnail,
                };
                setStagedBooks(prev => new Map(prev).set(cleanedIsbn, newBook));
            } else {
                 console.warn(`No book found for ISBN: ${cleanedIsbn}`);
            }
        } catch (error) {
            console.error('Error fetching book data:', error);
        } finally {
            setIsFetching(prev => {
                const next = new Set(prev);
                next.delete(cleanedIsbn);
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

    const handleManualAdd = () => {
        if (manualIsbn.trim()) {
            handleIsbnDetected(manualIsbn.trim());
            setManualIsbn('');
        }
    };

    const isApiSupported = !error?.includes('Barcode Detector API is not supported');

    return (
        <div className="fixed inset-0 bg-background flex flex-col">
            {isApiSupported && (
                 <>
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline />
                    <div className={`absolute inset-0 pointer-events-none transition-colors duration-300 border-8 ${scanHighlight ? 'border-green-400' : 'border-transparent'}`}></div>
                </>
            )}

            <div className={`absolute inset-0 flex flex-col justify-between p-4 ${isApiSupported ? 'bg-black bg-opacity-40' : ''}`}>
                <header className="flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-white shadow-lg">{isApiSupported ? 'Scan Books' : 'Add Books Manually'}</h2>
                    <button onClick={onClose} className="bg-black bg-opacity-50 rounded-full p-2 text-white">
                        <CloseIcon />
                    </button>
                </header>
                
                {!isApiSupported && (
                     <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
                        <div className="bg-surface p-6 rounded-lg shadow-lg max-w-sm w-full">
                            <p className="text-text-secondary mb-4">Your browser doesn't support live camera scanning.</p>
                            <p className="text-text-secondary mb-4">You can add books by entering the ISBN found on the back cover.</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualIsbn}
                                    onChange={(e) => setManualIsbn(e.target.value)}
                                    placeholder="Enter ISBN"
                                    className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                    onKeyPress={(e) => { if (e.key === 'Enter') handleManualAdd(); }}
                                />
                                <button
                                    onClick={handleManualAdd}
                                    className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {error && isApiSupported && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white p-4 rounded-lg">{error}</div>}

                <footer className="flex flex-col gap-4 z-10">
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