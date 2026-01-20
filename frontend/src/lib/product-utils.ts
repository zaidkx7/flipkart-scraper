import { Product as ApiProduct } from '@/api/routers/products';

// Interface for the frontend product format (compatible with existing Storefront)
export interface FrontendProduct {
  id: string;
  brand: string;
  model: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  specs: {
    ram: string;
    storage: string;
    network: string;
    color: string;
    processor: string;
    battery: string;
    display: string;
    camera: string;
  };
  rating: number;
  ratingCount: number;
  reviewCount: number;
  discount: number;
  warranty: string;
  inStock: boolean;
  description: string;
  features: string[];
  category: string;
  url: string;
  product_id: string;
  ratingBreakup: number[];
}

// Transform API product to frontend product format
export const transformApiProduct = (apiProduct: ApiProduct): FrontendProduct => {
  // Extract brand and model from title
  const titleParts = apiProduct.title.split(' ');
  const brand = titleParts[0] || 'Unknown';
  const model = titleParts.slice(1).join(' ') || 'Unknown Model';

  // Get current price (non-struck price)
  const currentPrice = apiProduct.pricing.prices.find(p => !p.strikeOff)?.value || 0;
  const originalPrice = apiProduct.pricing.prices.find(p => p.strikeOff)?.value;

  // Extract specs from specifications array
  const specs = extractSpecs(apiProduct.specifications);

  // Get primary image and all images
  const images = apiProduct.media.map(url =>
    url.replace('{@width}', '600').replace('{@height}', '600').replace('{@quality}', '80')
  );
  const primaryImage = images[0] || '/placeholder-product.jpg';

  // Extract discount
  const discount = apiProduct.pricing.totalDiscount || 0;

  return {
    id: apiProduct.id.toString(),
    brand,
    model,
    price: currentPrice,
    originalPrice,
    image: primaryImage,
    images,
    specs,
    rating: apiProduct.rating?.average || 0,
    ratingCount: apiProduct.rating?.count || 0,
    reviewCount: apiProduct.rating?.reviewCount || 0,
    discount,
    warranty: apiProduct.warrantySummary || 'No warranty info',
    inStock: apiProduct.availability === 'IN_STOCK',
    description: `${brand} ${model} with ${specs.ram} RAM, ${specs.storage} storage, ${specs.processor}, ${specs.battery} battery. ${apiProduct.warrantySummary}`,
    features: apiProduct.specifications,
    category: apiProduct.category,
    url: apiProduct.url,
    product_id: apiProduct.product_id,
    ratingBreakup: apiProduct.rating?.breakup || [],
  };
};

// Extract structured specs from specifications array
const extractSpecs = (specifications: string[]): {
  ram: string;
  storage: string;
  network: string;
  color: string;
  processor: string;
  battery: string;
  display: string;
  camera: string;
} => {
  const specs = {
    ram: 'Unknown',
    storage: 'Unknown',
    network: 'Unknown',
    color: 'Unknown',
    processor: 'Unknown Processor',
    battery: 'Unknown Battery',
    display: 'Unknown Display',
    camera: 'Unknown Camera',
  };

  specifications.forEach(spec => {
    const lowerSpec = spec.toLowerCase();

    // Extract RAM
    const ramMatch = lowerSpec.match(/(\d+)\s*(gb|mb)\s*ram/);
    if (ramMatch) {
      specs.ram = `${ramMatch[1]}${ramMatch[2].toUpperCase()}`;
    }

    // Extract Storage
    const storageMatch = lowerSpec.match(/(\d+)\s*(gb|mb)\s*rom/);
    if (storageMatch) {
      specs.storage = `${storageMatch[1]}${storageMatch[2].toUpperCase()}`;
    }

    // Extract Network
    if (lowerSpec.includes('5g')) {
      specs.network = '5G';
    } else if (lowerSpec.includes('4g')) {
      specs.network = '4G';
    }

    // Extract display size for color approximation (since color info isn't in specs)
    const displayMatch = lowerSpec.match(/\((.*?)\)/);
    if (displayMatch && displayMatch[1]) {
      // Try to find color in parenthesis or title if possible, but here we just extracting from parens if it looks like color
      // Actually standard logic: if it mentions 'inch' or 'display', it is display
    }

    // Better Color Extraction: Look for color keywords if present, otherwise 'Unknown'
    // (This is hard without structured color data, relying on existing logic or title)
    // For now, keep existing logic if it was working? 
    // The previous logic was: specs.color = displayMatch[1].split(',')[0] || 'Unknown';
    // This was extracting "6.74 inch" as color, which is WRONG. 
    // Let's try to find color in title in the caller, here defaults to Unknown.
    // However, looking at sample.json, "Prism Blue" comes from Title.
    // We'll parse Title for color in `transformApiProduct`? Or here?
    // Let's leave color as 'Unknown' here unless we find specific color keywords.
    // For now, let's focus on other specs.

    // Processor
    if (lowerSpec.includes('processor')) {
      specs.processor = spec.replace('Processor', '').trim();
    }

    // Battery
    if (lowerSpec.includes('mah')) {
      specs.battery = spec;
    }

    // Camera
    if (lowerSpec.includes('camera') || lowerSpec.includes('mp')) {
      specs.camera = spec;
    }

    // Display
    if (lowerSpec.includes('display') || lowerSpec.includes('inch')) {
      specs.display = spec;
    }
  });

  return specs;
};

// Filter functions for API products
export const filterProducts = (
  products: FrontendProduct[],
  filters: {
    brands?: string[];
    priceRange?: [number, number];
    ram?: string[];
    storage?: string[];
    colors?: string[];
    network?: string[];
    rating?: number;
    inStockOnly?: boolean;
    category?: string;
  }
): FrontendProduct[] => {
  return products.filter(product => {
    if (filters.brands && filters.brands.length > 0 && !filters.brands.includes(product.brand)) {
      return false;
    }

    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      if (product.price < min || product.price > max) {
        return false;
      }
    }

    if (filters.ram && filters.ram.length > 0 && !filters.ram.includes(product.specs.ram)) {
      return false;
    }

    if (filters.storage && filters.storage.length > 0 && !filters.storage.includes(product.specs.storage)) {
      return false;
    }

    if (filters.colors && filters.colors.length > 0 && !filters.colors.includes(product.specs.color)) {
      return false;
    }

    if (filters.network && filters.network.length > 0 && !filters.network.includes(product.specs.network)) {
      return false;
    }

    if (filters.rating && product.rating < filters.rating) {
      return false;
    }

    if (filters.inStockOnly && !product.inStock) {
      return false;
    }

    if (filters.category && product.category !== filters.category) {
      return false;
    }

    return true;
  });
};

// Sort products
export const sortProducts = (
  products: FrontendProduct[],
  sortBy: string
): FrontendProduct[] => {
  const sorted = [...products];

  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'newest':
      return sorted; // API returns newest first by default
    case 'relevance':
    default:
      return sorted;
  }
};

// Get unique values for filters
export const getFilterOptions = (products: FrontendProduct[]) => {
  const brands = [...new Set(products.map(p => p.brand))].sort();
  const ram = [...new Set(products.map(p => p.specs.ram))].sort();
  const storage = [...new Set(products.map(p => p.specs.storage))].sort();
  const colors = [...new Set(products.map(p => p.specs.color))].sort();
  const network = [...new Set(products.map(p => p.specs.network))].sort();
  const categories = [...new Set(products.map(p => p.category))].sort();

  // Calculate price range
  const prices = products.map(p => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    brands,
    ram,
    storage,
    colors,
    network,
    categories,
    priceRange: [Math.floor(minPrice), Math.ceil(maxPrice)] as [number, number],
  };
};