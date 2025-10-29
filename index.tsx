// --- Type Augmentation for Window object ---
// Fix for errors on window.BarcodeDetector and window.jspdf
interface BarcodeDetectorOptions {
    formats?: string[];
}
interface DetectedBarcode {
    rawValue: string;
}
declare class BarcodeDetector {
    constructor(options?: BarcodeDetectorOptions);
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}
interface Window {
    BarcodeDetector: typeof BarcodeDetector;
    jspdf: {
        jsPDF: new () => any;
    };
}

// --- Type Definitions ---
interface Book {
    id: string;
    title: string;
    authors: string[];
    coverUrl?: string;
}

// --- App State ---
// Fix: Add types for state variables for better type safety
let libraryBooks: Book[] = [];
let stagedBooks = new Map<string, Book>();
let isFetching = new Set<string>();
let barcodeDetector: BarcodeDetector | undefined;
let isScanning = false;
let animationFrameId: number | null = null;
let videoStream: MediaStream | null = null;

const API_URL = 'https://www.googleapis.com/books/v1/volumes?q=isbn:';
const LIBRARY_STORAGE_KEY = 'personal-library';

// --- DOM Element References ---
// Fix: Cast DOM elements to their specific types to resolve property errors
const loadingView = document.getElementById('loading-view') as HTMLElement;
const appContainer = document.getElementById('app-container') as HTMLElement;
const libraryView = document.getElementById('library-view') as HTMLElement;
const bookGrid = document.getElementById('book-grid') as HTMLElement;
const emptyLibraryMessage = document.getElementById('empty-library-message') as HTMLElement;
const exportButton = document.getElementById('export-button') as HTMLButtonElement;
const addButton = document.getElementById('add-button') as HTMLButtonElement;
const scannerView = document.getElementById('scanner-view') as HTMLElement;
const scannerVideo = document.getElementById('scanner-video') as HTMLVideoElement;
const scannerHighlight = document.getElementById('scanner-highlight') as HTMLElement;
const scannerTitle = document.getElementById('scanner-title') as HTMLElement;
const closeScannerButton = document.getElementById('close-scanner-button') as HTMLButtonElement;
const manualAddView = document.getElementById('manual-add-view') as HTMLElement;
const manualIsbnInput = document.getElementById('manual-isbn-input') as HTMLInputElement;
const manualAddButton = document.getElementById('manual-add-button') as HTMLButtonElement;
const scannerErrorMessage = document.getElementById('scanner-error-message') as HTMLElement;
const fetchingIndicator = document.getElementById('fetching-indicator') as HTMLElement;
const stagedBooksContainer = document.getElementById('staged-books-container') as HTMLElement;
const saveBooksButton = document.getElementById('save-books-button') as HTMLButtonElement;
const exportModal = document.getElementById('export-modal') as HTMLElement;
const closeExportModalButton = document.getElementById('close-export-modal-button') as HTMLButtonElement;
const exportTxtButton = document.getElementById('export-txt-button') as HTMLButtonElement;
const exportPdfButton = document.getElementById('export-pdf-button') as HTMLButtonElement;
const copyClipboardButton = document.getElementById('copy-clipboard-button') as HTMLButtonElement;

// --- Services ---
const storageService = {
  async getBooks(): Promise<Book[]> {
    const stored = localStorage.getItem(LIBRARY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },
  async addBooks(newBooks: Book[]) {
    const currentBooks = await this.getBooks();
    const libraryMap = new Map(currentBooks.map(b => [b.id, b]));
    newBooks.forEach(b => libraryMap.set(b.id, b));
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(Array.from(libraryMap.values())));
  }
};

// --- Rendering ---
function renderLibrary() {
  bookGrid.innerHTML = '';
  if (libraryBooks.length === 0) {
    emptyLibraryMessage.style.display = 'flex';
    exportButton.style.display = 'none';
  } else {
    emptyLibraryMessage.style.display = 'none';
    exportButton.style.display = 'flex';
    libraryBooks.forEach(book => {
      const bookCoverHtml = `
        <div class="aspect-[2/3] bg-surface rounded-md overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300 group">
          ${book.coverUrl ? 
            `<img src="${book.coverUrl}" alt="Cover of ${book.title}" class="w-full h-full object-cover" />` : 
            `<div class="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p class="text-sm font-bold mt-2 text-text-primary">${book.title}</p>
             </div>`
          }
        </div>`;
      bookGrid.insertAdjacentHTML('beforeend', bookCoverHtml);
    });
  }
}

function renderStagedBooks() {
    stagedBooksContainer.innerHTML = '';
    Array.from(stagedBooks.values()).forEach(book => {
        const cardHtml = `
            <div class="flex-shrink-0 w-24 h-40 bg-surface rounded-lg overflow-hidden shadow-md flex flex-col items-center p-1 text-center">
                ${book.coverUrl ? 
                    `<img src="${book.coverUrl}" alt="${book.title}" class="w-full h-28 object-cover rounded-sm"/>` : 
                    `<div class="w-full h-28 bg-gray-700 flex items-center justify-center"><span class="text-3xl text-gray-500">?</span></div>`
                }
                <p class="text-xs font-semibold mt-1 text-text-primary truncate w-full">${book.title}</p>
            </div>`;
        stagedBooksContainer.insertAdjacentHTML('beforeend', cardHtml);
    });
    
    // Update save button
    const count = stagedBooks.size;
    // Fix: 'disabled' property exists on HTMLButtonElement
    saveBooksButton.disabled = count === 0;
    if (count > 0) {
        saveBooksButton.textContent = `Add ${count} Book${count > 1 ? 's' : ''} to Library`;
    } else {
        saveBooksButton.textContent = 'Add to Library';
    }
}


// --- API / Fetching Logic ---
async function handleIsbnDetected(isbn: string) {
  const cleanedIsbn = isbn.replace(/[-\s]/g, '');
  if (isFetching.has(cleanedIsbn) || stagedBooks.has(cleanedIsbn)) {
    return;
  }

  scannerHighlight.classList.add('border-green-400');
  setTimeout(() => scannerHighlight.classList.remove('border-green-400'), 300);

  isFetching.add(cleanedIsbn);
  fetchingIndicator.style.display = 'flex';
  
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
      stagedBooks.set(cleanedIsbn, newBook);
      renderStagedBooks();
    } else {
      console.warn(`No book found for ISBN: ${cleanedIsbn}`);
    }
  } catch (error) {
    console.error('Error fetching book data:', error);
  } finally {
    isFetching.delete(cleanedIsbn);
    if (isFetching.size === 0) {
      fetchingIndicator.style.display = 'none';
    }
  }
}


// --- Scanner ---
async function scanFrame() {
  // Fix: 'readyState' property exists on HTMLVideoElement
  if (!isScanning || !barcodeDetector || scannerVideo.readyState < 2) {
    animationFrameId = requestAnimationFrame(scanFrame);
    return;
  }
  try {
    const barcodes = await barcodeDetector.detect(scannerVideo);
    for (const barcode of barcodes) {
      handleIsbnDetected(barcode.rawValue);
    }
  } catch (err) {
    console.error('Error during barcode detection:', err);
  }
  animationFrameId = requestAnimationFrame(scanFrame);
}

async function startScanner() {
  if (!('BarcodeDetector' in window)) {
    scannerVideo.style.display = 'none';
    scannerTitle.textContent = 'Add Books Manually';
    manualAddView.style.display = 'flex';
    document.getElementById('scanner-overlay')!.classList.remove('bg-opacity-40');
    return;
  }

  try {
    scannerVideo.style.display = 'block';
    scannerTitle.textContent = 'Scan Books';
    manualAddView.style.display = 'none';

    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    // Fix: 'srcObject' and 'play' exist on HTMLVideoElement
    scannerVideo.srcObject = videoStream;
    await scannerVideo.play();

    // Fix: window.BarcodeDetector is now correctly typed and constructable
    barcodeDetector = new window.BarcodeDetector({ formats: ['ean_13'] });
    isScanning = true;
    scanFrame();
  } catch (err) {
    scannerErrorMessage.textContent = 'Could not access camera. Please grant permission.';
    scannerErrorMessage.style.display = 'block';
  }
}

function stopScanner() {
  isScanning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  // Fix: 'srcObject' property exists on HTMLVideoElement
  scannerVideo.srcObject = null;
}

// --- View Management ---
function showView(view: 'library' | 'scanner') {
  libraryView.style.display = 'none';
  scannerView.style.display = 'none';
  if (view === 'library') libraryView.style.display = 'block';
  else if (view === 'scanner') scannerView.style.display = 'flex';
}

// --- Event Handlers ---
async function onSaveBooks() {
  await storageService.addBooks(Array.from(stagedBooks.values()));
  stagedBooks.clear();
  renderStagedBooks();
  onCloseScanner();
  await initLibrary();
}

function onOpenScanner() {
  showView('scanner');
  startScanner();
}

function onCloseScanner() {
  stopScanner();
  showView('library');
}

function onManualAdd() {
    // Fix: 'value' property exists on HTMLInputElement
    const isbn = manualIsbnInput.value.trim();
    if (isbn) {
        handleIsbnDetected(isbn);
        manualIsbnInput.value = '';
    }
}

function onExport() {
  exportModal.style.display = 'flex';
}

function onCloseExport() {
  exportModal.style.display = 'none';
}

function formatLibraryForExport(books: Book[]) {
    return books.map(book => `${book.title} by ${book.authors.join(', ')}`).join('\n');
}

function onExportTxt() {
    const content = formatLibraryForExport(libraryBooks);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-library.txt';
    link.click();
    URL.revokeObjectURL(url);
}

function onExportPdf() {
    // Fix: window.jspdf is now correctly typed
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('My Personal Library', 14, 22);
    doc.setFontSize(11);
    const lines = libraryBooks.map(book => `${book.title} by ${book.authors.join(', ')}`);
    doc.text(lines, 14, 32);
    doc.save('my-library.pdf');
}

function onCopyClipboard() {
    const content = formatLibraryForExport(libraryBooks);
    navigator.clipboard.writeText(content).then(() => {
        const originalText = copyClipboardButton.textContent;
        copyClipboardButton.textContent = 'Copied to Clipboard!';
        setTimeout(() => {
            copyClipboardButton.textContent = originalText;
        }, 2000);
    });
}

// --- Initialization ---
async function initLibrary() {
    libraryBooks = await storageService.getBooks();
    renderLibrary();
    loadingView.style.display = 'none';
    appContainer.style.display = 'block';
}

function addEventListeners() {
    addButton.addEventListener('click', onOpenScanner);
    closeScannerButton.addEventListener('click', onCloseScanner);
    saveBooksButton.addEventListener('click', onSaveBooks);
    manualAddButton.addEventListener('click', onManualAdd);
    manualIsbnInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') onManualAdd();
    });
    exportButton.addEventListener('click', onExport);
    closeExportModalButton.addEventListener('click', onCloseExport);
    exportTxtButton.addEventListener('click', onExportTxt);
    exportPdfButton.addEventListener('click', onExportPdf);
    copyClipboardButton.addEventListener('click', onCopyClipboard);
}

// --- App Start ---
document.addEventListener('DOMContentLoaded', () => {
  addEventListeners();
  initLibrary();
});
