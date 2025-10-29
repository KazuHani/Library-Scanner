
import { Book } from '../types';

const LIBRARY_STORAGE_KEY = 'personal-library';

// Mock Firestore service using localStorage
export const firestoreService = {
  async getBooks(): Promise<Book[]> {
    console.log('Fetching books from mock Firestore (localStorage)...');
    try {
      const storedLibrary = localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (storedLibrary) {
        return JSON.parse(storedLibrary);
      }
      return [];
    } catch (error) {
      console.error("Error fetching books:", error);
      return [];
    }
  },

  async addBooks(books: Book[]): Promise<void> {
    console.log(`Adding ${books.length} books to mock Firestore (localStorage)...`);
    try {
      const currentLibrary = await this.getBooks();
      const newLibrary = [...currentLibrary];
      
      const existingIds = new Set(currentLibrary.map(b => b.id));

      books.forEach(book => {
        if (!existingIds.has(book.id)) {
          newLibrary.push(book);
        }
      });
      
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(newLibrary));
    } catch (error) {
      console.error("Error adding books:", error);
      throw error;
    }
  },
};
