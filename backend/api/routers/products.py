from fastapi import APIRouter, Query
from typing import Optional, List
from backend.alchemy.database import MysqlConnection

mysql = MysqlConnection()
router = APIRouter(prefix='/products', tags=['products'])

@router.get('/')
def get_products(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=1000, description="Items per page")
):
    products, total = mysql.get_products(page, limit)
    total_pages = (total + limit - 1) // limit
    
    return {
        "items": products,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

@router.get('/category/{category}')
def get_products_by_category(category: str):
    products = mysql.get_products_by_category(category)
    return products

@router.get('/brand/{brand}')
def get_products_by_brand(brand: str):
    products = mysql.get_products_by_brand(brand)
    return products

@router.get('/search')
def search_products(
    q: str = Query(..., description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=1000, description="Items per page")
):
    products, total = mysql.search_products(q, page, limit)
    total_pages = (total + limit - 1) // limit
    
    return {
        "items": products,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

@router.get('/filter/price')
def get_products_by_price_range(
    min_price: float = Query(..., description="Minimum price"),
    max_price: float = Query(..., description="Maximum price")
):
    products = mysql.get_products_by_price_range(min_price, max_price)
    return products

@router.get('/filter/rating')
def get_products_by_rating(min_rating: float = Query(..., description="Minimum rating")):
    products = mysql.get_products_by_rating(min_rating)
    return products

@router.get('/filter/availability')
def get_products_by_availability(status: str = Query("IN_STOCK", description="Availability status")):
    products = mysql.get_products_by_availability(status)
    return products

@router.get('/stats')
def get_product_statistics():
    stats = mysql.get_product_statistics()
    return stats

@router.get('/trending')
def get_trending_products(limit: int = Query(10, description="Number of trending products")):
    products = mysql.get_trending_products(limit)
    return products

@router.get('/discounted')
def get_discounted_products():
    products = mysql.get_discounted_products()
    return products

@router.get('/{id}')
def get_product(id: int):
    product = mysql.get_product(id)
    return product
