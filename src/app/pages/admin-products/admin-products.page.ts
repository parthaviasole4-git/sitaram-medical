import { Component, computed, inject, signal, effect } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { CatalogService, type Product } from '../../store/catalog.service';

@Component({
  selector: 'app-admin-products-page',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './admin-products.page.html',
  styleUrl: './admin-products.page.css'
})
export class AdminProductsPage {
  private readonly catalog = inject(CatalogService);

  readonly searchQuery = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 10;
  
  // API returns only current page items
  readonly products = computed(() => this.catalog.products());
  readonly total = computed(() => this.catalog.totalProducts());
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  readonly selectedProducts = signal<Set<string>>(new Set());

  readonly isAllSelected = computed(() => {
    const pageProducts = this.products();
    if (pageProducts.length === 0) return false;
    const selected = this.selectedProducts();
    return pageProducts.every(p => selected.has(p.id));
  });

  readonly pendingDelete = signal<{ type: 'single' | 'multiple'; id?: string; message: string } | null>(null);
  
  // Edit State
  readonly editingId = signal<string | null>(null);
  readonly editingQty = signal<number>(0);

  // Image Action State
  readonly pendingImageAction = signal<{ product: Product } | null>(null);
  readonly editingImageId = signal<string | null>(null);

  // Import State
  readonly importModalOpen = signal(false);
  readonly isImporting = signal(false);
  readonly importError = signal<string | null>(null);
  readonly importStats = signal<{ added: number; skipped: number } | null>(null);
  private selectedFile: File | null = null;
  private selectedImages: FileList | null = null;

  constructor() {
    // Load products whenever page or search query changes
    effect(() => {
        // Debounce search could be added here, but for now simple
        this.catalog.loadProducts(this.currentPage(), this.pageSize, this.searchQuery());
    });
  }

  setPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSearch(q: string) {
    this.searchQuery.set(q);
    this.currentPage.set(1);
  }

  readonly hasSelection = computed(() => this.selectedProducts().size > 0);

  toggleSelection(id: string) {
    const selected = new Set(this.selectedProducts());
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    this.selectedProducts.set(selected);
  }

  toggleAll() {
    const pageProducts = this.products();
    const selected = new Set(this.selectedProducts());
    const allSelected = this.isAllSelected();

    if (allSelected) {
      pageProducts.forEach(p => selected.delete(p.id));
    } else {
      pageProducts.forEach(p => selected.add(p.id));
    }
    this.selectedProducts.set(selected);
  }

  deleteProduct(id: string) {
    this.pendingDelete.set({
      type: 'single',
      id,
      message: 'Are you sure you want to delete this product ? This action cannot be undone.'
    });
  }

  deleteSelected() {
    const count = this.selectedProducts().size;
    if (count === 0) return;
    
    this.pendingDelete.set({
      type: 'multiple',
      message: `Are you sure you want to delete ${count} products ? This action cannot be undone.`
    });
  }

  confirmDelete() {
    const pending = this.pendingDelete();
    if (!pending) return;

    if (pending.type === 'single' && pending.id) {
      this.catalog.deleteProduct(pending.id);
      const selected = new Set(this.selectedProducts());
      selected.delete(pending.id);
      this.selectedProducts.set(selected);
    } else if (pending.type === 'multiple') {
      const ids = Array.from(this.selectedProducts());
      this.catalog.deleteProducts(ids);
      this.selectedProducts.set(new Set());
    }

    this.pendingDelete.set(null);
  }

  cancelDelete() {
    this.pendingDelete.set(null);
  }

  // Edit Logic
  startEdit(p: Product) {
    this.editingId.set(p.id);
    this.editingQty.set(p.quantity);
  }

  saveEdit() {
    const id = this.editingId();
    if (!id) return;
    
    const qty = this.editingQty();
    if (qty < 0) return;

    this.catalog.updateProductQuantity(id, qty);
    this.editingId.set(null);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  // Image Logic
  onImageClick(p: Product) {
    if (p.imageDataUrl) {
      this.pendingImageAction.set({ product: p });
    } else {
      this.triggerImageUpload(p.id);
    }
  }

  closeImageActionModal() {
    this.pendingImageAction.set(null);
  }

  triggerImageUpload(id: string) {
    this.editingImageId.set(id);
    this.pendingImageAction.set(null); // Close modal if open
    document.getElementById('hidden-image-input')?.click();
  }

  removeImage() {
    const action = this.pendingImageAction();
    if (action) {
      this.catalog.updateProductImage(action.product.id, '');
      this.pendingImageAction.set(null);
    }
  }

  async onImageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const id = this.editingImageId();
    
    if (input.files && input.files.length > 0 && id) {
      const file = input.files[0];
      try {
        const base64 = await this.fileToBase64(file);
        this.catalog.updateProductImage(id, base64);
      } catch (e) {
        console.error('Error reading image file', e);
      }
    }
    
    // Reset input
    input.value = '';
    this.editingImageId.set(null);
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Import Logic
  openImportModal() {
    this.importModalOpen.set(true);
    this.importError.set(null);
    this.importStats.set(null);
    this.selectedFile = null;
    this.selectedImages = null;
  }

  closeImportModal() {
    this.importModalOpen.set(false);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImages = input.files;
    }
  }

  async importProducts() {
    if (!this.selectedFile) {
      this.importError.set('Please select an Excel file.');
      return;
    }

    this.isImporting.set(true);
    this.importError.set(null);

    try {
      const buffer = await this.selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(ws);

      if (data.length === 0) {
        throw new Error('Excel file is empty.');
      }

      const newProducts: any[] = [];
      let skipped = 0;

      for (const row of data) {
        if (!row.title || !row.price) continue; // Basic validation

        let imageDataUrl = '';
        
        // Try to match image
        if (row.image && this.selectedImages) {
          const imageName = row.image.trim();
          const imageFile = Array.from(this.selectedImages).find(f => f.name === imageName);
          
          if (imageFile) {
            imageDataUrl = await this.readFileAsDataUrl(imageFile);
          }
        }

        // If no image found, use a placeholder
        if (!imageDataUrl) {
          imageDataUrl = this.createPlaceholderSvg(row.category || 'Part');
        }

        newProducts.push({
          // id is not needed for import, backend generates it
          title: row.title,
          price: row.price, // passed as is, service handles cleanup
          tag: row.tag || '',
          category: row.category || 'Uncategorized',
          imageDataUrl,
          quantity: row.quantity // passed as is
        });
      }

      if (newProducts.length > 0) {
        this.catalog.importProducts(newProducts).subscribe({
          next: (res: any) => {
             this.importStats.set({ added: res.count || newProducts.length, skipped });
             // Reset after 2 seconds if successful
             setTimeout(() => {
               this.closeImportModal();
               // Refresh the list to show new products
               this.catalog.loadProducts(this.currentPage(), this.pageSize, this.searchQuery());
             }, 2000);
          },
          error: (err) => {
            this.importError.set('Failed to import products. ' + (err.message || ''));
          }
        });
      } else {
        this.importError.set('No valid products found in file.');
      }

    } catch (err: any) {
      this.importError.set(err.message || 'Failed to import products.');
    } finally {
      this.isImporting.set(false);
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Placeholder Generator
  private createPlaceholderSvg(category: string): string {
    const color = this.getColorForCategory(category);
    const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" fill="${color}" text-anchor="middle" dy=".3em">
        ${category.charAt(0).toUpperCase()}
      </text>
    </svg>`;
    return `data:image/svg+xml;base64,${window.btoa(svg)}`;
  }

  private getColorForCategory(category: string): string {
    const colors: { [key: string]: string } = {
      'Engine': '#ef4444',
      'Brakes': '#f59e0b',
      'Suspension': '#10b981',
      'Electrical': '#3b82f6',
      'Body': '#6366f1',
      'Interior': '#8b5cf6',
      'Uncategorized': '#6b7280'
    };
    return colors[category] || colors['Uncategorized'];
  }

  readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    let start = Math.max(current - 2, 1);
    let end = Math.min(start + 4, total);

    if (end === total) {
        start = Math.max(end - 4, 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });
}
