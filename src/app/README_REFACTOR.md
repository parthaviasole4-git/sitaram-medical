
I have successfully refactored the project to remove static data and ensure all critical modules (Cart, Orders, Catalog, Home) are powered by the backend API services.

### **Changes Implemented**

1.  **Catalog Service (`catalog.service.ts`)**
    *   **Removed Static Data:** Deleted the hardcoded `categoryMetadata` object.
    *   **Dynamic Categories:** The `categories` list is now computed directly from the API response (`GET /products/categories`). Subtitles are generated dynamically ("Browse Products") instead of being static.
    *   **Products:** Loading, adding, and deleting products are fully integrated with the backend.

2.  **Home Page (`home.page.html`)**
    *   **Dynamic Categories:** The category cards now loop through the dynamic `categories()` signal from the service.
    *   **Search Integration:** The search bar now correctly redirects to the Products page with the search query, triggering a live API search.

3.  **Cart & Badge**
    *   **Cart Service:** Fully API-driven. `loadCart()` fetches items from the server.
    *   **Header Badge:** The cart number in the header (`AppShellPage`) binds to `CartService.count`, which is computed from the API-loaded items.

4.  **Orders**
    *   **Service-Driven:** Both "My Orders" (Customer) and "Admin Orders" pages now fetch data exclusively via `OrdersService` from the backend (`GET /orders/my` and `GET /admin/orders`).
    *   **No Static Fallback:** Removed any reliance on local mock arrays for orders.

### **Verification**
*   **Categories:** The Home page displays categories fetched from the server.
*   **Search:** Searching on the Home page takes you to the Products page with filtered results from the API.
*   **Cart Count:** The badge number updates automatically when you add/remove items (persisted to DB).
*   **Orders:** Order history is loaded from the database.

You can now test the full flow: **Home (Categories/Search) -> Products (API) -> Add to Cart (Badge Updates) -> Checkout -> Orders (DB Data)**.
