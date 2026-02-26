import api from '../index';

// In-memory cache for performance optimization
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ProductCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

const productCache = new ProductCache();

// Cleanup cache periodically
setInterval(() => productCache.cleanup(), 60000); // Every minute

// TypeScript interfaces for API responses
export interface Rating {
  type: string;
  average: number;
  base: number;
  breakup: number[];
  count: number;
  histogramBaseCount: number;
  reviewCount: number;
  roundOffCount: string;
}

export interface PriceInfo {
  strikeOff: boolean;
  value: number;
}

export interface PlusPriceInfo {
  type: string;
  data: Array<{
    type: string;
    value: {
      type: string;
      style: {
        color: string;
        fontSize: number;
        fontWeight: string;
      };
      text: string;
    };
  }>;
}

export interface Pricing {
  discountAmount: number;
  plusPriceInfo: PlusPriceInfo;
  priceTags: any;
  prices: PriceInfo[];
  showDiscountAsAmount: boolean;
  totalDiscount: number;
}

export interface Product {
  id: number;
  product_id: string;
  title: string;
  url: string;
  rating: Rating;
  specifications: string[];
  media: string[];
  pricing: Pricing;
  category: string;
  warrantySummary: string;
  availability: string;
  source: string;
  time_update: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: string;
}

// Paginated response interface
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Products API functions
export const productsApi = {
  // Get all products with caching and pagination
  getAllProducts: async (page: number = 1, limit: number = 20): Promise<PaginatedResponse<Product>> => {
    const cacheKey = `products_page_${page}_limit_${limit}`;

    // Try cache first
    const cached = productCache.get<PaginatedResponse<Product>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<PaginatedResponse<Product>>(`/products/?page=${page}&limit=${limit}`);
      const data = response.data;

      // Cache the results
      productCache.set(cacheKey, data);

      return data;
    } catch (error) {
      throw new Error('Failed to fetch products');
    }
  },

  // Get single product by ID
  getProductById: async (id: number): Promise<Product> => {
    try {
      const response = await api.get<Product>(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch product with ID ${id}`);
    }
  },

  // Fetch all options globally across items
  fetchGlobalFilterOptions: async () => {
    // We use a reasonably high limit to capture variation. Cached automatically.
    const response = await productsApi.getAllProducts(1, 500);
    return response.items;
  },

  // Enhanced search with fuzzy matching and caching
  searchProducts: async (query: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<Product>> => {
    if (!query.trim()) return { items: [], total: 0, page: 1, limit: 20, total_pages: 0 };

    const cacheKey = `search_${query.toLowerCase().trim()}_page_${page}_limit_${limit}`;
    const cached = productCache.get<PaginatedResponse<Product>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // First try backend search
      const response = await api.get<PaginatedResponse<Product>>(`/products/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
      const results = response.data;
      productCache.set(cacheKey, results, 2 * 60 * 1000); // 2 minutes cache
      return results;
    } catch (error) {
      // Advanced client-side search with scoring
      const response = await productsApi.getAllProducts(1, 1000); // Fetch mostly all for client side
      const allProducts = response.items;
      const searchTerms = query.toLowerCase().trim().split(/\s+/);

      const scoredResults = allProducts.map(product => {
        let score = 0;
        const searchableText = [
          product.title,
          product.category,
          ...product.specifications
        ].join(' ').toLowerCase();

        searchTerms.forEach(term => {
          // Exact matches get higher scores
          if (product.title.toLowerCase().includes(term)) score += 10;
          if (product.category.toLowerCase().includes(term)) score += 8;

          // Specification matches
          product.specifications.forEach(spec => {
            if (spec.toLowerCase().includes(term)) score += 5;
          });

          // Fuzzy matching for typos
          if (searchableText.includes(term)) score += 3;

          // Partial matches
          if (searchableText.split(' ').some(word => word.startsWith(term))) score += 2;
        });

        return { product, score };
      })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ product }) => product);

      // Manual client-side pagination
      const total = scoredResults.length;
      const total_pages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedItems = scoredResults.slice(offset, offset + limit);

      const paginatedResult = {
        items: paginatedItems,
        total,
        page,
        limit,
        total_pages
      };

      // Cache client-side results too
      productCache.set(cacheKey, paginatedResult, 2 * 60 * 1000);
      return paginatedResult;
    }
  },

  // Optimized category filtering with caching
  getProductsByCategory: async (category: string): Promise<Product[]> => {
    const cacheKey = `category_${category.toLowerCase()}`;
    const cached = productCache.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<Product[]>(`/products/category/${encodeURIComponent(category)}`);
      const results = response.data;
      productCache.set(cacheKey, results);
      return results;
    } catch (error) {
      // Optimized client-side filtering
      const response = await productsApi.getAllProducts(1, 1000);
      const allProducts = response.items;
      const results = allProducts.filter(product =>
        product.category.toLowerCase() === category.toLowerCase()
      );

      productCache.set(cacheKey, results);
      return results;
    }
  },

  // Optimized brand filtering with better matching
  getProductsByBrand: async (brand: string): Promise<Product[]> => {
    const cacheKey = `brand_${brand.toLowerCase()}`;
    const cached = productCache.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<Product[]>(`/products/brand/${encodeURIComponent(brand)}`);
      const results = response.data;
      productCache.set(cacheKey, results);
      return results;
    } catch (error) {
      // Enhanced brand matching
      const response = await productsApi.getAllProducts(1, 1000);
      const allProducts = response.items;
      const brandLower = brand.toLowerCase();

      const results = allProducts.filter(product => {
        const titleLower = product.title.toLowerCase();
        // Match brand name at start of title or as separate word
        return titleLower.startsWith(brandLower) ||
          titleLower.includes(` ${brandLower} `) ||
          titleLower.split(' ')[0] === brandLower;
      });

      productCache.set(cacheKey, results);
      return results;
    }
  },

  // Get product statistics (for admin/analytics)
  getProductStats: async (): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byAvailability: Record<string, number>;
    avgRating: number;
  }> => {
    const cacheKey = 'product_stats';
    const cached = productCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get('/products/stats');
      const stats = response.data;
      productCache.set(cacheKey, stats, 15 * 60 * 1000); // 15 minutes cache
      return stats;
    } catch (error) {
      const response = await productsApi.getAllProducts(1, 1000);
      const products = response.items;
      const stats = {
        total: products.length,
        byCategory: {} as Record<string, number>,
        byAvailability: {} as Record<string, number>,
        avgRating: 0,
      };

      let totalRating = 0;
      let ratingCount = 0;

      products.forEach(product => {
        // Category stats
        stats.byCategory[product.category] = (stats.byCategory[product.category] || 0) + 1;

        // Availability stats
        stats.byAvailability[product.availability] = (stats.byAvailability[product.availability] || 0) + 1;

        // Rating stats
        if (product.rating && product.rating.average) {
          totalRating += product.rating.average;
          ratingCount++;
        }
      });

      stats.avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      productCache.set(cacheKey, stats, 15 * 60 * 1000);
      return stats;
    }
  },

  // Advanced filtering methods not in backend

  // Filter products by price range
  getProductsByPriceRange: async (minPrice: number, maxPrice: number): Promise<Product[]> => {
    const cacheKey = `price_${minPrice}_${maxPrice}`;
    const cached = productCache.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<Product[]>(`/products/filter/price?min_price=${minPrice}&max_price=${maxPrice}`);
      const results = response.data;
      productCache.set(cacheKey, results, 3 * 60 * 1000);
      return results;
    } catch (error) {
      // Fallback to client-side filtering
      const response = await productsApi.getAllProducts(1, 1000);
      const allProducts = response.items;
      const results = allProducts.filter(product => {
        const currentPrice = product.pricing.prices.find(p => !p.strikeOff)?.value || 0;
        return currentPrice >= minPrice && currentPrice <= maxPrice;
      });

      productCache.set(cacheKey, results, 3 * 60 * 1000);
      return results;
    }
  },

  // Filter products by rating
  getProductsByRating: async (minRating: number): Promise<Product[]> => {
    const cacheKey = `rating_${minRating}`;
    const cached = productCache.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<Product[]>(`/products/filter/rating?min_rating=${minRating}`);
      const results = response.data;
      productCache.set(cacheKey, results, 3 * 60 * 1000);
      return results;
    } catch (error) {
      const response = await productsApi.getAllProducts(1, 1000);
      const allProducts = response.items;
      const results = allProducts.filter(product =>
        product.rating && product.rating.average >= minRating
      );

      productCache.set(cacheKey, results, 3 * 60 * 1000);
      return results;
    }
  },

  // Filter products by availability
  getProductsByAvailability: async (availability: string = 'IN_STOCK'): Promise<Product[]> => {
    const cacheKey = `availability_${availability}`;
    const cached = productCache.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<Product[]>(`/products/filter/availability?status=${encodeURIComponent(availability)}`);
      const results = response.data;
      productCache.set(cacheKey, results, 3 * 60 * 1000);
      return results;
    } catch (error) {
      const response = await productsApi.getAllProducts(1, 1000);
      const allProducts = response.items;
      const results = allProducts.filter(product =>
        product.availability === availability
      );

      productCache.set(cacheKey, results, 3 * 60 * 1000);
      return results;
    }
  },

  // Advanced multi-criteria filtering
  getFilteredProducts: async (filters: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    availability?: string;
    specifications?: string[];
  }): Promise<Product[]> => {
    // Create cache key from filters
    const filterKey = Object.entries(filters)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}:${Array.isArray(value) ? value.join(',') : value}`)
      .sort()
      .join('|');

    const cacheKey = `multi_filter_${btoa(filterKey)}`;
    const cached = productCache.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await productsApi.getAllProducts(1, 1000);
    const allProducts = response.items;

    const results = allProducts.filter(product => {
      // Category filter
      if (filters.category && product.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }

      // Brand filter
      if (filters.brand) {
        const brandLower = filters.brand.toLowerCase();
        const titleLower = product.title.toLowerCase();
        if (!titleLower.includes(brandLower)) {
          return false;
        }
      }

      // Price range filter
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const currentPrice = product.pricing.prices.find(p => !p.strikeOff)?.value || 0;
        if (filters.minPrice !== undefined && currentPrice < filters.minPrice) {
          return false;
        }
        if (filters.maxPrice !== undefined && currentPrice > filters.maxPrice) {
          return false;
        }
      }

      // Rating filter
      if (filters.minRating !== undefined) {
        if (!product.rating || product.rating.average < filters.minRating) {
          return false;
        }
      }

      // Availability filter
      if (filters.availability && product.availability !== filters.availability) {
        return false;
      }

      // Specifications filter
      if (filters.specifications && filters.specifications.length > 0) {
        const hasAllSpecs = filters.specifications.every(spec =>
          product.specifications.some(prodSpec =>
            prodSpec.toLowerCase().includes(spec.toLowerCase())
          )
        );
        if (!hasAllSpecs) {
          return false;
        }
      }

      return true;
    });

    productCache.set(cacheKey, results, 2 * 60 * 1000); // 2 minutes for complex queries
    return results;
  },

  // Get trending/popular products (based on rating and review count)
  getTrendingProducts: async (limit: number = 10): Promise<Product[]> => {
    const cacheKey = `trending_${limit}`;
    const cached = productCache.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<Product[]>(`/products/trending?limit=${limit}`);
      const results = response.data;
      productCache.set(cacheKey, results, 10 * 60 * 1000);
      return results;
    } catch (error) {
      const response = await productsApi.getAllProducts(1, 1000);
      const allProducts = response.items;

      // Calculate trending score based on rating and review count
      const trending = allProducts
        .filter(product => product.rating && product.rating.average > 0)
        .map(product => ({
          product,
          trendingScore: (product.rating.average * 0.7) +
            (Math.min(product.rating.reviewCount / 1000, 1) * 0.3) * 5
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit)
        .map(({ product }) => product);

      productCache.set(cacheKey, trending, 10 * 60 * 1000);
      return trending;
    }
  },

  // Get products with discounts
  getDiscountedProducts: async (): Promise<Product[]> => {
    const cacheKey = 'discounted_products';
    const cached = productCache.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<Product[]>('/products/discounted');
      const results = response.data;
      productCache.set(cacheKey, results, 5 * 60 * 1000);
      return results;
    } catch (error) {
      const response = await productsApi.getAllProducts(1, 1000);
      const allProducts = response.items;
      const results = allProducts.filter(product =>
        product.pricing.totalDiscount > 0 &&
        product.pricing.prices.some(p => p.strikeOff) // Has original price
      );

      // Sort by discount percentage
      results.sort((a, b) => b.pricing.totalDiscount - a.pricing.totalDiscount);

      productCache.set(cacheKey, results, 5 * 60 * 1000);
      return results;
    }
  },

  // Clear cache manually
  clearCache: (): void => {
    productCache.clear();
  },

  // Get cache statistics
  getCacheStats: (): { entries: number; size: string } => {
    const entries = productCache['cache'].size;
    const sizeBytes = JSON.stringify([...productCache['cache'].entries()]).length;
    return {
      entries,
      size: `${(sizeBytes / 1024).toFixed(2)} KB`
    };
  },
};

export default productsApi;