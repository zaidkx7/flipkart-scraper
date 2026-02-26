"""
This module contains the FlipkartScraper class, 
which is used to scrape Flipkart products using the search URL with BeautifulSoup.

supports pagination and saving to database.
"""

import os
import time
import json

from retry import retry
from bs4 import BeautifulSoup
from curl_cffi import requests
from urllib.parse import urljoin
import asyncio

from backend.utils.logger import get_logger
from backend.alchemy.database import MysqlConnection
from backend.api.ws import manager

class FlipkartScraper:
    BASE_URL: str = "https://www.flipkart.com/"
    MODULE: str = 'FLIPKART'
    SEARCH_URL: str = urljoin(BASE_URL, "search")
    FILES_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'files')
    if not os.path.exists(FILES_DIR):
        os.makedirs(FILES_DIR)
    ENABLE_PAGINATION: bool = True
    MAX_PAGES: int = 10
    PAGE: int = 1
    IMPERSONATE: str = 'chrome136'
    
    def __init__(self):
        self.logger = get_logger(self.MODULE)
        self.mysql: MysqlConnection = MysqlConnection()
        
        # Analytics Tracking
        self.stats = {
            "total_scraped": 0,
            "duplicates": 0,
            "errors": 0,
            "pages_processed": 0
        }
        self.is_cancelled = False
        self._log('Initializing Flipkart Scraper...', level="info")

    def _dispatch_ws(self, coro):
        """Helper to run async websocket broadcasts from synchronous scraper methods."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We are in an event loop (e.g., BackgroundTasks in FastAPI)
                loop.create_task(coro)
            else:
                loop.run_until_complete(coro)
        except RuntimeError:
            # Create a new event loop if there is none
            asyncio.run(coro)

    def _log(self, message: str, level: str = "info"):
        if level == "error":
            self.logger.error(message)
        elif level == "warning":
            self.logger.warning(message)
        else:
            self.logger.info(message)
            
        self._dispatch_ws(manager.send_log(message, level))
        
    def _update_stats(self):
        self._dispatch_ws(manager.send_stats(self.stats))

    @retry(Exception, tries=3, delay=2)
    def get_response(self, url: str, query: str = None) -> requests.Response:
        params = {
            'q': query,
            'otracker': 'search',
            'otracker1': 'search',
            'marketplace': 'FLIPKART',
            'as-show': 'off',
            'as': 'off',
            'page': self.PAGE
        }
        response = requests.get(url, params=params, impersonate=self.IMPERSONATE)
        if not response.ok:
            raise Exception('Failed to fetch URL: %s Reason: %s' % (url, response.reason))
        
        return response
    
    def get_json_response(self, soup: BeautifulSoup) -> dict:
        script = soup.find('script', id='is_script')
        if script:
            try:
                script_text = script.string.replace('window.__INITIAL_STATE__ = ', '').rstrip(';')
                return json.loads(script_text)
            except json.JSONDecodeError:
                self.stats["errors"] += 1
                self._update_stats()
                self._log('Failed to parse JSON data', level="error")
                return {}
        self.stats["errors"] += 1
        self._update_stats()
        self._log('No script found with id: is_script', level="error")
        return {}
    
    def get_products(self, json_response: dict) -> list:
        PRODUCTS = []
        for item in json_response['pageDataV4']['page']['data'].values():
            for slot in item:
                if slot['slotType'] == 'WIDGET' and slot['widget']['type'] == 'PRODUCT_SUMMARY':
                    PRODUCTS.append(slot['widget']['data']['products'][0]['productInfo']['value'])
        return PRODUCTS


    def get_product_details(self, product: dict) -> dict:
        availability = product.get('availability', {}).get('displayState', 'No availability information available')
        return {
            'product_id': product['id'],
            'title': product['titles']['title'],
            'url': urljoin(self.BASE_URL, product['baseUrl']),
            'rating': product.get('rating', 'No rating available'),
            'specifications': product.get('keySpecs', 'No specifications available'),
            'media': [img['url'] for img in product['media']['images']],
            'pricing': product.get('pricing', 'No pricing information available'),
            'category': product['vertical'],
            'warrantySummary': product.get('warrantySummary', 'No warranty information available'),
            'availability': availability,
            'source': 'flipkart',
        }
    
    def save_to_json(self, data: dict, filename: str):
        with open(f'{self.FILES_DIR}/{filename}.json', 'w') as f:
            json.dump(data, f, indent=4)

    def save_to_db(self, product_details: dict):
        if not self.mysql.exists(product_details['product_id']):
            self.mysql.insert(product_details)
            self.stats["total_scraped"] += 1
            self._log('Product saved: %s' % (product_details.get('title', 'Unknown')[:50] + '...'), level="success")
        else:
            self.stats["duplicates"] += 1
            self._log('Duplicate skipped: %s' % (product_details.get('title', 'Unknown')[:50] + '...'), level="warning")
        self._update_stats()

    def start(self, query: str):
        response = self.get_response(self.SEARCH_URL, query)
        soup = BeautifulSoup(response.text, 'html.parser')
        self._log('Getting JSON response from Flipkart', level="info")
        json_response = self.get_json_response(soup)
        products = self.get_products(json_response)
        
        self._log(f'Extracted {len(products)} products from layout slot', level="info")
        for product in products:
            if self.is_cancelled:
                break
            try:
                product_details = self.get_product_details(product)
                self.save_to_db(product_details)
            except Exception as e:
                self.stats["errors"] += 1
                self._update_stats()
                self._log(f"Error processing product details: {str(e)}", level="error")
                
        self.stats["pages_processed"] += 1
        self._update_stats()

    def run(self, query: str = 'Mobile Phones'):
        self._dispatch_ws(manager.send_status("running"))
        self._log(f'Starting Scrape Job for query: "{query}"', level="info")
        
        try:
            if self.ENABLE_PAGINATION:
                self._log('PAGINATION ENABLED. target max pages: %s' % self.MAX_PAGES, level="info")
                while self.PAGE <= self.MAX_PAGES:
                    if self.is_cancelled:
                        self._log('Scrape Job Cancelled by User', level="warning")
                        break
                        
                    self._log(f'--- Fetching page {self.PAGE} of {self.MAX_PAGES} ---', level="info")
                    self.start(query)
                    
                    if self.is_cancelled:
                        self._log('Scrape Job Cancelled by User', level="warning")
                        break
                        
                    if self.PAGE < self.MAX_PAGES:
                        self._log('Sleeping for 5 seconds to prevent rate limiting...', level="warning")
                        time.sleep(5)
                    self.PAGE += 1
            else:
                self.start(query)
                
            self._log('Scrape Job Completed Successfully', level="success")
            self._dispatch_ws(manager.send_status("completed"))
            
        except Exception as e:
            self._log(f"Fatal error during script run: {str(e)}", level="error")
            self._dispatch_ws(manager.send_status("error"))

def run():
    return FlipkartScraper()

if __name__ == '__main__':
    run().run()
    