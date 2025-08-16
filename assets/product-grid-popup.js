/**
 * Product Grid and Popup Functionality
 * Handles product popup modal, variant selection, and cart operations
 * No jQuery - Pure Vanilla JavaScript
 */

class ProductGridPopup {
  constructor() {
    this.popup = null;
    this.currentProduct = null;
    this.selectedVariant = null;
    this.isLoading = false;
    
    this.init();
  }

  init() {
    this.createPopupHTML();
    this.bindEvents();
    this.initQuantityControls();
  }

  createPopupHTML() {
    // Create popup overlay if it doesn't exist
    if (document.getElementById('product-popup')) return;

    const popupHTML = `
      <div class="product-popup-overlay" id="product-popup">
        <div class="product-popup-modal">
          <button class="popup-close-btn" aria-label="Close popup">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          
          <div class="popup-content-wrapper">
            <div class="popup-image-section">
              <div class="popup-image-container">
                <img id="popup-product-image" src="" alt="" />
                <div class="image-loading" style="display: none;">
                  <div class="loading-spinner"></div>
                </div>
              </div>
            </div>
            
            <div class="popup-details-section">
              <div class="popup-product-info">
                <h3 id="popup-product-title"></h3>
                <div class="popup-price-container">
                  <span class="popup-compare-price" id="popup-compare-price" style="display: none;"></span>
                  <span class="popup-current-price" id="popup-product-price"></span>
                </div>
                <p class="popup-product-description" id="popup-product-description"></p>
              </div>
              
              <form class="popup-variant-form" id="popup-variant-form">
                <div class="variant-options-container" id="variant-options-container">
                  <!-- Variants will be dynamically inserted here -->
                </div>
                
                <div class="quantity-section">
                  <label class="quantity-label">Quantity</label>
                  <div class="quantity-controls">
                    <button type="button" class="qty-btn qty-decrease" aria-label="Decrease quantity">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </button>
                    <input type="number" class="qty-input" name="quantity" value="1" min="1" max="10" readonly>
                    <button type="button" class="qty-btn qty-increase" aria-label="Increase quantity">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 4V12M4 8H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <button type="submit" class="popup-add-to-cart-btn" id="popup-add-cart-btn">
                  <span class="btn-text">ADD TO CART</span>
                  <svg width="20" height="16" viewBox="0 0 20 16" fill="none" class="btn-arrow">
                    <path d="M12 1L19 8L12 15M19 8H1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
                
                <div class="variant-error" id="variant-error" style="display: none;">
                  <p>Please select all required options before adding to cart.</p>
                </div>
              </form>
              
              <div class="popup-stock-info">
                <span class="stock-indicator" id="popup-stock-indicator"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', popupHTML);
    this.popup = document.getElementById('product-popup');
  }

  bindEvents() {
    // Product grid item clicks
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-product-trigger]');
      if (trigger) {
        e.preventDefault();
        const productId = trigger.getAttribute('data-product-trigger');
        this.openProductPopup(productId);
      }
    });

    // Close popup events
    const closeBtn = document.querySelector('.popup-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closePopup());
    }

    // Click outside to close
    if (this.popup) {
      this.popup.addEventListener('click', (e) => {
        if (e.target === this.popup) {
          this.closePopup();
        }
      });
    }

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popup && this.popup.classList.contains('active')) {
        this.closePopup();
      }
    });

    // Form submission
    const form = document.getElementById('popup-variant-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleAddToCart(e));
    }

    // Variant change events
    document.addEventListener('change', (e) => {
      if (e.target.closest('#variant-options-container')) {
        this.handleVariantChange();
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.matches('.variant-color-btn')) {
        this.handleColorSelection(e);
      }
    });
  }

  initQuantityControls() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.qty-decrease')) {
        e.preventDefault();
        this.updateQuantity(-1);
      } else if (e.target.closest('.qty-increase')) {
        e.preventDefault();
        this.updateQuantity(1);
      }
    });
  }

  updateQuantity(change) {
    const qtyInput = document.querySelector('.qty-input');
    if (!qtyInput) return;

    const currentQty = parseInt(qtyInput.value) || 1;
    const newQty = Math.max(1, Math.min(10, currentQty + change));
    qtyInput.value = newQty;
  }

  async openProductPopup(productId) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoadingState();
    
    try {
      await this.loadProductData(productId);
      this.showPopup();
    } catch (error) {
      console.error('Error opening product popup:', error);
      this.showErrorState();
    } finally {
      this.isLoading = false;
    }
  }

  async loadProductData(productId) {
    // Try to get product data from existing page data first
    let product = this.getProductFromPage(productId);
    
    if (!product) {
      // Fetch from Shopify API
      const response = await fetch(`/products/${productId}.js`);
      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.status}`);
      }
      product = await response.json();
    }

    this.currentProduct = product;
    this.selectedVariant = product.variants[0]; // Default to first variant
    this.populatePopup(product);
  }

  getProductFromPage(productId) {
    // Look for product data in existing script tags
    const productScript = document.querySelector(`script[data-product-variants="${productId}"]`);
    if (productScript) {
      try {
        const data = JSON.parse(productScript.textContent);
        return data.product || data;
      } catch (e) {
        console.warn('Failed to parse product data from page:', e);
      }
    }
    return null;
  }

  populatePopup(product) {
    // Update product image
    const image = document.getElementById('popup-product-image');
    if (product.featured_image) {
      image.src = product.featured_image;
      image.alt = product.title;
    }

    // Update product title
    document.getElementById('popup-product-title').textContent = product.title;

    // Update product description
    const description = document.getElementById('popup-product-description');
    description.textContent = product.description || '';

    // Update price
    this.updatePrice(this.selectedVariant || product.variants[0]);

    // Setup variants
    this.setupVariants(product);

    // Update stock info
    this.updateStockInfo(this.selectedVariant || product.variants[0]);
  }

  setupVariants(product) {
    const container = document.getElementById('variant-options-container');
    container.innerHTML = '';

    if (product.variants.length <= 1) return;

    // Get unique options
    const option1Values = [...new Set(product.variants.map(v => v.option1).filter(Boolean))];
    const option2Values = [...new Set(product.variants.map(v => v.option2).filter(Boolean))];
    const option3Values = [...new Set(product.variants.map(v => v.option3).filter(Boolean))];

    // Create color options (assuming option1 is color)
    if (option1Values.length > 0) {
      const colorSection = this.createColorOptions('Color', option1Values, 'option1');
      container.appendChild(colorSection);
    }

    // Create size options (assuming option2 is size)
    if (option2Values.length > 0) {
      const sizeSection = this.createSizeOptions('Size', option2Values, 'option2');
      container.appendChild(sizeSection);
    }

    // Create additional options
    if (option3Values.length > 0) {
      const additionalSection = this.createSelectOptions('Style', option3Values, 'option3');
      container.appendChild(additionalSection);
    }
  }

  createColorOptions(label, values, optionKey) {
    const section = document.createElement('div');
    section.className = 'variant-section';
    
    section.innerHTML = `
      <label class="variant-label">${label}</label>
      <div class="variant-color-options">
        ${values.map(value => `
          <button type="button" class="variant-color-btn" data-option="${optionKey}" data-value="${value}">
            ${value}
          </button>
        `).join('')}
      </div>
    `;
    
    return section;
  }

  createSizeOptions(label, values, optionKey) {
    const section = document.createElement('div');
    section.className = 'variant-section';
    
    section.innerHTML = `
      <label class="variant-label">${label}</label>
      <select class="variant-size-select" data-option="${optionKey}">
        <option value="">Choose your size</option>
        ${values.map(value => `
          <option value="${value}">${value}</option>
        `).join('')}
      </select>
    `;
    
    return section;
  }

  createSelectOptions(label, values, optionKey) {
    const section = document.createElement('div');
    section.className = 'variant-section';
    
    section.innerHTML = `
      <label class="variant-label">${label}</label>
      <select class="variant-select" data-option="${optionKey}">
        <option value="">Choose ${label.toLowerCase()}</option>
        ${values.map(value => `
          <option value="${value}">${value}</option>
        `).join('')}
      </select>
    `;
    
    return section;
  }

  handleColorSelection(e) {
    e.preventDefault();
    
    // Remove selected class from siblings
    const siblings = e.target.parentNode.querySelectorAll('.variant-color-btn');
    siblings.forEach(btn => btn.classList.remove('selected'));
    
    // Add selected class to clicked button
    e.target.classList.add('selected');
    
    // Update variant
    this.handleVariantChange();
  }

  handleVariantChange() {
    const selectedOptions = this.getSelectedOptions();
    const matchingVariant = this.findMatchingVariant(selectedOptions);
    
    if (matchingVariant) {
      this.selectedVariant = matchingVariant;
      this.updatePrice(matchingVariant);
      this.updateStockInfo(matchingVariant);
      this.hideVariantError();
    } else {
      this.selectedVariant = null;
      this.showVariantError();
    }
    
    this.updateAddToCartButton();
  }

  getSelectedOptions() {
    const options = {};
    
    // Get color selection
    const selectedColor = document.querySelector('.variant-color-btn.selected');
    if (selectedColor) {
      options[selectedColor.dataset.option] = selectedColor.dataset.value;
    }
    
    // Get select values
    const selects = document.querySelectorAll('#variant-options-container select');
    selects.forEach(select => {
      if (select.value) {
        options[select.dataset.option] = select.value;
      }
    });
    
    return options;
  }

  findMatchingVariant(options) {
    if (!this.currentProduct) return null;
    
    return this.currentProduct.variants.find(variant => {
      return (!options.option1 || variant.option1 === options.option1) &&
             (!options.option2 || variant.option2 === options.option2) &&
             (!options.option3 || variant.option3 === options.option3);
    });
  }

  updatePrice(variant) {
    if (!variant) return;
    
    const priceElement = document.getElementById('popup-product-price');
    const comparePriceElement = document.getElementById('popup-compare-price');
    
    // Format price (convert from cents to euros)
    const price = this.formatPrice(variant.price);
    priceElement.textContent = price;
    
    // Handle compare at price
    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      const comparePrice = this.formatPrice(variant.compare_at_price);
      comparePriceElement.textContent = comparePrice;
      comparePriceElement.style.display = 'inline';
    } else {
      comparePriceElement.style.display = 'none';
    }
  }

  formatPrice(cents) {
    const euros = (cents / 100).toFixed(2);
    return euros.replace('.', ',') + '€';
  }

  updateStockInfo(variant) {
    const stockIndicator = document.getElementById('popup-stock-indicator');
    if (!stockIndicator || !variant) return;
    
    if (variant.available) {
      if (variant.inventory_quantity > 0) {
        stockIndicator.textContent = `${variant.inventory_quantity} in stock`;
        stockIndicator.className = 'stock-indicator in-stock';
      } else {
        stockIndicator.textContent = 'In stock';
        stockIndicator.className = 'stock-indicator in-stock';
      }
    } else {
      stockIndicator.textContent = 'Out of stock';
      stockIndicator.className = 'stock-indicator out-of-stock';
    }
  }

  updateAddToCartButton() {
    const button = document.getElementById('popup-add-cart-btn');
    const btnText = button.querySelector('.btn-text');
    
    if (this.selectedVariant && this.selectedVariant.available) {
      button.disabled = false;
      btnText.textContent = 'ADD TO CART';
      button.classList.remove('disabled');
    } else {
      button.disabled = true;
      btnText.textContent = this.selectedVariant ? 'SOLD OUT' : 'UNAVAILABLE';
      button.classList.add('disabled');
    }
  }

  showVariantError() {
    const errorElement = document.getElementById('variant-error');
    if (errorElement) {
      errorElement.style.display = 'block';
    }
  }

  hideVariantError() {
    const errorElement = document.getElementById('variant-error');
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }

  async handleAddToCart(e) {
    e.preventDefault();
    
    if (!this.selectedVariant || !this.selectedVariant.available) {
      this.showVariantError();
      return;
    }
    
    const quantity = parseInt(document.querySelector('.qty-input').value) || 1;
    
    try {
      this.setLoadingState(true);
      
      // Add main product to cart
      await this.addToCart(this.selectedVariant.id, quantity);
      
      // Check for special condition: Black + Medium
      await this.checkSpecialConditions();
      
      this.showSuccessMessage();
      this.closePopup();
      
      // Trigger cart update event
      this.triggerCartUpdate();
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showErrorMessage('Failed to add item to cart. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  async checkSpecialConditions() {
    const selectedOptions = this.getSelectedOptions();
    
    // Check if Black color and Medium size are selected
    if ((selectedOptions.option1 === 'Black' && selectedOptions.option2 === 'Medium') ||
        (selectedOptions.option2 === 'Black' && selectedOptions.option1 === 'Medium')) {
      
      try {
        await this.addSoftWinterJacket();
      } catch (error) {
        console.warn('Could not add winter jacket:', error);
        // Don't fail the main add to cart for this
      }
    }
  }

  async addSoftWinterJacket() {
    try {
      // Try to fetch the winter jacket product
      const response = await fetch('/products/soft-winter-jacket.js');
      if (response.ok) {
        const jacket = await response.json();
        if (jacket && jacket.variants && jacket.variants[0]) {
          await this.addToCart(jacket.variants[0].id, 1);
        }
      }
    } catch (error) {
      // Handle cases where the product doesn't exist
      console.warn('Soft Winter Jacket product not found:', error);
    }
  }

  async addToCart(variantId, quantity) {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        id: variantId,
        quantity: quantity
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add to cart');
    }
    
    return response.json();
  }

  setLoadingState(loading) {
    const button = document.getElementById('popup-add-cart-btn');
    const btnText = button.querySelector('.btn-text');
    
    if (loading) {
      button.disabled = true;
      btnText.textContent = 'ADDING...';
      button.classList.add('loading');
    } else {
      button.disabled = false;
      this.updateAddToCartButton();
      button.classList.remove('loading');
    }
  }

  showSuccessMessage() {
    this.showNotification('Added to cart successfully!', 'success');
  }

  showErrorMessage(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.popup-notification');
    existing.forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = `popup-notification ${type}`;
    notification.textContent = message;
    
    const styles = {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '15px 20px',
      borderRadius: '6px',
      fontWeight: '600',
      zIndex: '10001',
      animation: 'slideInRight 0.3s ease-out'
    };
    
    if (type === 'success') {
      styles.background = '#10b981';
      styles.color = 'white';
    } else if (type === 'error') {
      styles.background = '#ef4444';
      styles.color = 'white';
    }
    
    Object.assign(notification.style, styles);
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 4000);
  }

  triggerCartUpdate() {
    // Trigger cart drawer update if it exists
    const event = new CustomEvent('cart:updated');
    document.dispatchEvent(event);
    
    // Update cart count if element exists
    this.updateCartCount();
  }

  async updateCartCount() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      const cartCountElements = document.querySelectorAll('.cart-count');
      cartCountElements.forEach(el => {
        el.textContent = cart.item_count;
      });
    } catch (error) {
      console.warn('Could not update cart count:', error);
    }
  }

  showPopup() {
    if (this.popup) {
      this.popup.classList.add('active');
      document.body.classList.add('popup-open');
      
      // Focus management for accessibility
      const closeBtn = this.popup.querySelector('.popup-close-btn');
      if (closeBtn) closeBtn.focus();
    }
  }

  closePopup() {
    if (this.popup) {
      this.popup.classList.remove('active');
      document.body.classList.remove('popup-open');
      
      // Reset form
      this.resetPopupForm();
    }
  }

  resetPopupForm() {
    // Reset variant selections
    const colorBtns = document.querySelectorAll('.variant-color-btn');
    colorBtns.forEach(btn => btn.classList.remove('selected'));
    
    const selects = document.querySelectorAll('#variant-options-container select');
    selects.forEach(select => select.value = '');
    
    // Reset quantity
    const qtyInput = document.querySelector('.qty-input');
    if (qtyInput) qtyInput.value = '1';
    
    // Clear error states
    this.hideVariantError();
    
    // Reset variant
    this.selectedVariant = null;
  }

  showLoadingState() {
    if (this.popup) {
      this.popup.classList.add('loading');
    }
  }

  showErrorState() {
    this.showErrorMessage('Failed to load product. Please try again.');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const productGrid = new ProductGridPopup();
  
  // Make it globally accessible for debugging
  window.ProductGridPopup = productGrid;
});

// Add CSS animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  body.popup-open {
    overflow: hidden;
  }
`;
document.head.appendChild(style);
