"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, ListFilter, SearchX, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Battery, LogOut, User as UserIcon, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { productsApi } from "@/api/routers/products";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";

import {
  transformApiProduct,
  filterProducts,
  sortProducts,
  getFilterOptions,
  type FrontendProduct
} from "@/lib/product-utils";

// Use the FrontendProduct type from utils
type Product = FrontendProduct;

// CartItem interface removed - no shopping functionality needed

interface Filters {
  brands: string[];
  priceRange: [number, number];
  ram: string[];
  storage: string[];
  colors: string[];
  network: string[];
  condition: string[];
  rating: number;
  inStockOnly: boolean;
}

// Filter options will be dynamically generated from API data

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    brands: [],
    priceRange: [0, 50000],
    ram: [],
    storage: [],
    colors: [],
    network: [],
    condition: [],
    rating: 0,
    inStockOnly: false
  });
  const [filterOptions, setFilterOptions] = useState({
    brands: [] as string[],
    ram: [] as string[],
    storage: [] as string[],
    colors: [] as string[],
    network: [] as string[],
    condition: ["New", "Refurbished"] as string[],
    priceRange: [0, 50000] as [number, number],
  });
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [pageSize, setPageSize] = useState(12);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [quickViewImageIndex, setQuickViewImageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const { user, isAuthenticated, logout } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset image index when product changes
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedProduct]);

  useEffect(() => {
    setQuickViewImageIndex(0);
  }, [quickViewProduct]);

  // Keyboard navigation for image gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedProduct) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setSelectedImageIndex(prev =>
            prev <= 0 ? selectedProduct.images.length - 1 : prev - 1
          );
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setSelectedImageIndex(prev =>
            prev >= selectedProduct.images.length - 1 ? 0 : prev + 1
          );
        }
      } else if (quickViewProduct) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setQuickViewImageIndex(prev =>
            prev <= 0 ? quickViewProduct.images.length - 1 : prev - 1
          );
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setQuickViewImageIndex(prev =>
            prev >= quickViewProduct.images.length - 1 ? 0 : prev + 1
          );
        }
      }
    };

    if (selectedProduct || quickViewProduct) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedProduct, quickViewProduct]);

  // Load products from API on mount and when pagination changes
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        let response;
        if (searchQuery.trim()) {
          // Use search endpoint if query exists
          response = await productsApi.searchProducts(searchQuery, currentPage, pageSize);
        } else {
          // Otherwise get all products
          response = await productsApi.getAllProducts(currentPage, pageSize);
        }

        const apiProducts = response.items;

        // Update pagination state
        setTotalItems(response.total);
        setTotalPages(response.total_pages);

        const transformedProducts = apiProducts.map(transformApiProduct);

        setAllProducts(transformedProducts);
        setProducts(transformedProducts);

        // Update filter options based on loaded products (Note: For correct global filtering, 
        // we might typically need a separate endpoint for options, but using current page for now 
        // or we can fetch a larger set for filters if needed. Sticking to current page for speed.)
        const options = getFilterOptions(transformedProducts);
        setFilterOptions(prev => ({
          ...prev,
          brands: options.brands,
          ram: options.ram,
          storage: options.storage,
          colors: options.colors,
          network: options.network,
          priceRange: options.priceRange,
        }));
      } catch (err) {
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Debounce search requests
    const timer = setTimeout(() => {
      loadProducts();
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timer);
  }, [currentPage, pageSize, searchQuery]); // Add searchQuery to dependencies

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = filterProducts(products, filters);
    return sortProducts(filtered, sortBy);
  }, [products, filters, sortBy]);

  // Open product on Flipkart
  const openOnFlipkart = useCallback((product: Product) => {
    window.open(product.url, '_blank', 'noopener,noreferrer');
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      brands: [],
      priceRange: filterOptions.priceRange,
      ram: [],
      storage: [],
      colors: [],
      network: [],
      condition: [],
      rating: 0,
      inStockOnly: false
    });
  }, [filterOptions.priceRange]);

  const refreshProducts = useCallback(async () => {
    try {
      setLoading(true);
      productsApi.clearCache();
      const response = await productsApi.getAllProducts(currentPage, pageSize);
      const transformedProducts = response.items.map(transformApiProduct);
      setProducts(transformedProducts);
      setAllProducts(transformedProducts);
      setTotalItems(response.total);
      setTotalPages(response.total_pages);
      toast.success('Products refreshed');
    } catch (err) {
      toast.error('Failed to refresh products');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  // Image navigation handlers
  const nextImage = useCallback((isQuickView = false) => {
    if (isQuickView && quickViewProduct) {
      setQuickViewImageIndex(prev =>
        prev >= quickViewProduct.images.length - 1 ? 0 : prev + 1
      );
    } else if (selectedProduct) {
      setSelectedImageIndex(prev =>
        prev >= selectedProduct.images.length - 1 ? 0 : prev + 1
      );
    }
  }, [selectedProduct, quickViewProduct]);

  const prevImage = useCallback((isQuickView = false) => {
    if (isQuickView && quickViewProduct) {
      setQuickViewImageIndex(prev =>
        prev <= 0 ? quickViewProduct.images.length - 1 : prev - 1
      );
    } else if (selectedProduct) {
      setSelectedImageIndex(prev =>
        prev <= 0 ? selectedProduct.images.length - 1 : prev - 1
      );
    }
  }, [selectedProduct, quickViewProduct]);

  const selectImage = useCallback((index: number, isQuickView = false) => {
    if (isQuickView) {
      setQuickViewImageIndex(index);
    } else {
      setSelectedImageIndex(index);
    }
  }, []);

  const FilterSection = () => (
    <div className="space-y-6 p-4">


      {/* Price Range */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Price Range: ₹{filters.priceRange[0].toLocaleString()} - ₹{filters.priceRange[1].toLocaleString()}
        </Label>
        <Slider
          value={filters.priceRange}
          onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
          max={filterOptions.priceRange[1]}
          min={filterOptions.priceRange[0]}
          step={Math.ceil((filterOptions.priceRange[1] - filterOptions.priceRange[0]) / 100)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>₹{filterOptions.priceRange[0].toLocaleString()}</span>
          <span>₹{filterOptions.priceRange[1].toLocaleString()}</span>
        </div>
      </div>

      <Separator />

      {/* Brand Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Brand</Label>
        <div className="space-y-2">
          {filterOptions.brands.map(brand => (
            <div key={brand} className="flex items-center space-x-2">
              <Checkbox
                id={`brand-${brand}`}
                checked={filters.brands.includes(brand)}
                onCheckedChange={(checked) => {
                  setFilters(prev => ({
                    ...prev,
                    brands: checked
                      ? [...prev.brands, brand]
                      : prev.brands.filter(b => b !== brand)
                  }));
                }}
              />
              <Label htmlFor={`brand-${brand}`} className="text-sm">{brand}</Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* RAM Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">RAM</Label>
        <div className="space-y-2">
          {filterOptions.ram.map(ram => (
            <div key={ram} className="flex items-center space-x-2">
              <Checkbox
                id={`ram-${ram}`}
                checked={filters.ram.includes(ram)}
                onCheckedChange={(checked) => {
                  setFilters(prev => ({
                    ...prev,
                    ram: checked
                      ? [...prev.ram, ram]
                      : prev.ram.filter(r => r !== ram)
                  }));
                }}
              />
              <Label htmlFor={`ram-${ram}`} className="text-sm">{ram}</Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Storage Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Storage</Label>
        <div className="space-y-2">
          {filterOptions.storage.map(storage => (
            <div key={storage} className="flex items-center space-x-2">
              <Checkbox
                id={`storage-${storage}`}
                checked={filters.storage.includes(storage)}
                onCheckedChange={(checked) => {
                  setFilters(prev => ({
                    ...prev,
                    storage: checked
                      ? [...prev.storage, storage]
                      : prev.storage.filter(s => s !== storage)
                  }));
                }}
              />
              <Label htmlFor={`storage-${storage}`} className="text-sm">{storage}</Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* In Stock Only */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="in-stock"
          checked={filters.inStockOnly}
          onCheckedChange={(checked) => setFilters(prev => ({ ...prev, inStockOnly: !!checked }))}
        />
        <Label htmlFor="in-stock" className="text-sm">In Stock Only</Label>
      </div>

      <div className="pt-4 space-y-2">
        <Button onClick={clearFilters} variant="outline" className="w-full">
          Clear All Filters
        </Button>
      </div>
    </div>
  );

  const ProductCard = ({ product }: { product: Product }) => (
    <Card className="group cursor-pointer transition-all hover:shadow-lg h-full flex flex-col">
      <CardHeader className="p-0">
        <div className="relative">
          <div className="h-48 flex items-center justify-center p-4 bg-white rounded-t-lg relative">
            <img
              src={product.image}
              alt={`${product.brand} ${product.model}`}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              onClick={() => setSelectedProduct(product)}
            />
            {product.discount > 0 && (
              <Badge className="absolute top-2 right-2 bg-green-600 hover:bg-green-700">
                {product.discount}% OFF
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="space-y-2 flex-1">
          <h3 className="font-semibold text-sm line-clamp-2">{product.brand} {product.model}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {product.specs.ram} • {product.specs.storage} • {product.specs.processor}
          </p>
          {product.specs.battery !== 'Unknown Battery' && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 w-fit px-2 py-0.5 rounded-full mt-1">
              <Battery className="w-3 h-3" />
              <span>{product.specs.battery}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="space-x-2">
              <span className="font-bold text-lg">₹{product.price.toLocaleString()}</span>
              {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  ₹{product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
            {!product.inStock && (
              <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center bg-green-700 text-white text-xs px-1.5 py-0.5 rounded gap-0.5 font-semibold">
              {product.rating} <span className="text-[10px]">★</span>
            </span>
            <span className="text-muted-foreground text-xs">
              ({product.ratingCount.toLocaleString()} Ratings & {product.reviewCount.toLocaleString()} Reviews)
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setQuickViewProduct(product)}
        >
          Quick View
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => openOnFlipkart(product)}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          View on Flipkart
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary">Flipkart Product Explorer</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshProducts}
                disabled={loading}
                title="Refresh products"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search phones..."
                  className="pl-10 pr-4"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                    onClick={() => setSearchQuery("")}
                  >
                    <SearchX className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Product Stats */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground hidden md:inline-block">
                {totalItems} products found
              </span>

              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8 hover:cursor-pointer">
                        <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.username}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer w-full flex items-center">
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/users" className="cursor-pointer w-full flex items-center">
                          <Users className="mr-2 h-4 w-4" />
                          <span>Manage Users</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button variant="default" size="sm">
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Promo Strip */}
      <div className="bg-primary text-primary-foreground py-2">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center text-sm font-medium">
            📊 Explore & Compare Flipkart Products | Real-time Data from Flipkart
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Filters</h3>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  <FilterSection />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Product Area */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <ListFilter className="w-4 h-4 mr-2" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-full mt-4">
                      <FilterSection />
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
                <span className="text-sm text-muted-foreground">
                  {filteredAndSortedProducts.length} results
                </span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products Grid */}
            {error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Products</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={refreshProducts}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-square bg-muted rounded-t-lg"></div>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredAndSortedProducts.length === 0 ? (
              <div className="text-center py-12">
                <SearchX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filters
                </p>
                <Button onClick={clearFilters}>Clear All Filters</Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {filteredAndSortedProducts.length > 0 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>

                    <div className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-4xl">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProduct.brand} {selectedProduct.model}</DialogTitle>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="aspect-square relative group bg-white rounded-lg flex items-center justify-center p-4 border">
                    <img
                      src={selectedProduct.images[selectedImageIndex] || selectedProduct.image}
                      alt={selectedProduct.model}
                      className="w-full h-full object-contain"
                    />

                    {/* Navigation Arrows */}
                    {selectedProduct.images.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-0"
                          onClick={() => prevImage(false)}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-0"
                          onClick={() => nextImage(false)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>

                        {/* Image Counter */}
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          {selectedImageIndex + 1} of {selectedProduct.images.length}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Navigation */}
                  {selectedProduct.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {selectedProduct.images.map((img, index) => (
                        <button
                          key={index}
                          className={`flex-shrink-0 w-16 h-16 rounded border-2 transition-all ${index === selectedImageIndex
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                          onClick={() => selectImage(index, false)}
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover rounded"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold">₹{selectedProduct.price.toLocaleString()}</span>
                      {selectedProduct.originalPrice && (
                        <span className="text-lg text-muted-foreground line-through">
                          ₹{selectedProduct.originalPrice.toLocaleString()}
                        </span>
                      )}
                      {selectedProduct.discount > 0 && (
                        <Badge variant="secondary" className="text-green-600 bg-green-50 font-bold">
                          {selectedProduct.discount}% OFF
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex items-center bg-green-700 text-white px-2 py-0.5 rounded text-sm font-semibold gap-1">
                        {selectedProduct.rating} ★
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {selectedProduct.ratingCount.toLocaleString()} Ratings & {selectedProduct.reviewCount.toLocaleString()} Reviews
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Specifications</h4>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">RAM</span>
                        <span>{selectedProduct.specs.ram}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Storage</span>
                        <span>{selectedProduct.specs.storage}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Processor</span>
                        <span className="text-right">{selectedProduct.specs.processor}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Battery</span>
                        <span>{selectedProduct.specs.battery}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Camera</span>
                        <span className="text-right">{selectedProduct.specs.camera}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Display</span>
                        <span className="text-right">{selectedProduct.specs.display}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Network</span>
                        <span>{selectedProduct.specs.network}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Warranty</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      {selectedProduct.warranty}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Key Features</h4>
                    <ul className="text-sm space-y-1">
                      {selectedProduct.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-primary rounded-full"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => openOnFlipkart(selectedProduct)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Flipkart
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick View Dialog */}
      <Dialog open={!!quickViewProduct} onOpenChange={() => setQuickViewProduct(null)}>
        <DialogContent>
          {quickViewProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{quickViewProduct.brand} {quickViewProduct.model}</DialogTitle>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="aspect-square relative group bg-white rounded-lg flex items-center justify-center p-4 border">
                    <img
                      src={quickViewProduct.images[quickViewImageIndex] || quickViewProduct.image}
                      alt={quickViewProduct.model}
                      className="w-full h-full object-contain"
                    />

                    {/* Navigation Arrows */}
                    {quickViewProduct.images.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-0"
                          onClick={() => prevImage(true)}
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-0"
                          onClick={() => nextImage(true)}
                        >
                          <ChevronRight className="w-3 h-3" />
                        </Button>

                        {/* Image Counter */}
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          {quickViewImageIndex + 1} of {quickViewProduct.images.length}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Navigation */}
                  {quickViewProduct.images.length > 1 && (
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {quickViewProduct.images.map((img, index) => (
                        <button
                          key={index}
                          className={`flex-shrink-0 w-12 h-12 rounded border-2 transition-all ${index === quickViewImageIndex
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                          onClick={() => selectImage(index, true)}
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover rounded"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">₹{quickViewProduct.price.toLocaleString()}</span>
                    {quickViewProduct.originalPrice && (
                      <span className="text-muted-foreground line-through">
                        ₹{quickViewProduct.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="text-sm space-y-1">
                    <div>RAM: {quickViewProduct.specs.ram}</div>
                    <div>Storage: {quickViewProduct.specs.storage}</div>
                    <div>Network: {quickViewProduct.specs.network}</div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => openOnFlipkart(quickViewProduct)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Flipkart
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}