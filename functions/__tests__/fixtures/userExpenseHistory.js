/**
 * User Expense History Test Fixtures
 * Provides sample user expense data for testing ML category prediction
 */

// User with extensive history (100+ expenses)
const experiencedUser = {
  userId: 'user-experienced-001',
  expenses: [
    // Groceries - 25 expenses
    { merchant: 'Whole Foods Market', category: 'groceries', amount: 67.32, description: 'Weekly groceries' },
    { merchant: 'Whole Foods Market', category: 'groceries', amount: 54.21, description: 'Organic produce' },
    { merchant: 'Whole Foods Market', category: 'groceries', amount: 89.45, description: 'Groceries and household items' },
    { merchant: 'Trader Joes', category: 'groceries', amount: 43.67, description: 'Grocery shopping' },
    { merchant: 'Trader Joes', category: 'groceries', amount: 52.18, description: 'Weekly groceries' },
    { merchant: 'Safeway', category: 'groceries', amount: 71.29, description: 'Food shopping' },
    { merchant: 'Safeway', category: 'groceries', amount: 45.92, description: 'Groceries' },
    { merchant: 'Kroger', category: 'groceries', amount: 38.54, description: 'Weekly food' },
    { merchant: 'Target', category: 'groceries', amount: 94.32, description: 'Groceries and supplies' },
    { merchant: 'Walmart Supercenter', category: 'groceries', amount: 112.45, description: 'Food and household' },
    { merchant: 'Costco', category: 'groceries', amount: 156.78, description: 'Bulk groceries' },
    { merchant: 'Aldi', category: 'groceries', amount: 32.45, description: 'Weekly shopping' },
    { merchant: 'Sprouts Farmers Market', category: 'groceries', amount: 41.23, description: 'Fresh produce' },
    { merchant: 'Fresh Market', category: 'groceries', amount: 58.90, description: 'Organic food' },
    { merchant: 'Whole Foods Market', category: 'groceries', amount: 76.54, description: 'Groceries' },
    { merchant: 'Trader Joes', category: 'groceries', amount: 39.87, description: 'Food shopping' },
    { merchant: 'Safeway', category: 'groceries', amount: 62.34, description: 'Weekly groceries' },
    { merchant: 'Kroger', category: 'groceries', amount: 48.92, description: 'Groceries' },
    { merchant: 'Target', category: 'groceries', amount: 83.21, description: 'Food and essentials' },
    { merchant: 'Walmart Supercenter', category: 'groceries', amount: 97.65, description: 'Weekly shopping' },
    { merchant: 'Whole Foods Market', category: 'groceries', amount: 72.18, description: 'Groceries' },
    { merchant: 'Trader Joes', category: 'groceries', amount: 46.54, description: 'Weekly food' },
    { merchant: 'Costco', category: 'groceries', amount: 189.32, description: 'Bulk shopping' },
    { merchant: 'Aldi', category: 'groceries', amount: 28.76, description: 'Groceries' },
    { merchant: 'Sprouts Farmers Market', category: 'groceries', amount: 51.43, description: 'Organic produce' },

    // Food/Dining - 25 expenses
    { merchant: 'Starbucks', category: 'food', amount: 5.67, description: 'Morning coffee' },
    { merchant: 'Starbucks', category: 'food', amount: 6.32, description: 'Latte and croissant' },
    { merchant: 'Starbucks', category: 'food', amount: 4.89, description: 'Coffee' },
    { merchant: 'Starbucks', category: 'food', amount: 7.21, description: 'Breakfast' },
    { merchant: 'Starbucks', category: 'food', amount: 5.43, description: 'Coffee and muffin' },
    { merchant: 'Chipotle Mexican Grill', category: 'food', amount: 12.45, description: 'Lunch burrito' },
    { merchant: 'Chipotle Mexican Grill', category: 'food', amount: 13.67, description: 'Lunch bowl' },
    { merchant: 'Panera Bread', category: 'food', amount: 11.23, description: 'Soup and sandwich' },
    { merchant: 'Panera Bread', category: 'food', amount: 9.87, description: 'Lunch' },
    { merchant: 'McDonalds', category: 'food', amount: 8.32, description: 'Fast food lunch' },
    { merchant: 'Subway', category: 'food', amount: 9.45, description: 'Sandwich' },
    { merchant: 'Pizza Hut', category: 'food', amount: 24.56, description: 'Pizza dinner' },
    { merchant: 'Dominos Pizza', category: 'food', amount: 21.78, description: 'Pizza delivery' },
    { merchant: 'The Cheesecake Factory', category: 'food', amount: 67.89, description: 'Dinner out' },
    { merchant: 'Olive Garden', category: 'food', amount: 54.32, description: 'Italian dinner' },
    { merchant: 'Red Lobster', category: 'food', amount: 72.45, description: 'Seafood dinner' },
    { merchant: 'Dennys', category: 'food', amount: 18.76, description: 'Breakfast' },
    { merchant: 'IHOP', category: 'food', amount: 22.34, description: 'Pancake breakfast' },
    { merchant: 'Starbucks', category: 'food', amount: 6.78, description: 'Coffee' },
    { merchant: 'Dunkin Donuts', category: 'food', amount: 5.21, description: 'Coffee and donut' },
    { merchant: 'Taco Bell', category: 'food', amount: 9.87, description: 'Lunch' },
    { merchant: 'Wendys', category: 'food', amount: 11.23, description: 'Burger meal' },
    { merchant: 'Chick-fil-A', category: 'food', amount: 10.45, description: 'Chicken sandwich' },
    { merchant: 'Five Guys', category: 'food', amount: 16.78, description: 'Burger and fries' },
    { merchant: 'Shake Shack', category: 'food', amount: 14.32, description: 'Burgers' },

    // Transport - 20 expenses
    { merchant: 'Shell Gas Station', category: 'transport', amount: 45.67, description: 'Gas fill-up' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 42.34, description: 'Gasoline' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 48.92, description: 'Gas' },
    { merchant: 'Chevron', category: 'transport', amount: 51.23, description: 'Gas fill-up' },
    { merchant: 'Chevron', category: 'transport', amount: 47.89, description: 'Gasoline' },
    { merchant: 'BP Gas Station', category: 'transport', amount: 43.21, description: 'Gas' },
    { merchant: 'Exxon Mobil', category: 'transport', amount: 49.56, description: 'Gas fill-up' },
    { merchant: 'Texaco', category: 'transport', amount: 44.78, description: 'Gasoline' },
    { merchant: 'Uber', category: 'transport', amount: 18.45, description: 'Ride to airport' },
    { merchant: 'Uber', category: 'transport', amount: 12.34, description: 'Ride home' },
    { merchant: 'Uber', category: 'transport', amount: 15.67, description: 'Uber ride' },
    { merchant: 'Lyft', category: 'transport', amount: 14.23, description: 'Ride to work' },
    { merchant: 'Lyft', category: 'transport', amount: 16.89, description: 'Lyft ride' },
    { merchant: 'Metro Transit', category: 'transport', amount: 25.00, description: 'Monthly bus pass' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 46.32, description: 'Gas' },
    { merchant: 'Chevron', category: 'transport', amount: 50.45, description: 'Gasoline' },
    { merchant: 'BP Gas Station', category: 'transport', amount: 41.87, description: 'Gas fill-up' },
    { merchant: 'Uber', category: 'transport', amount: 13.56, description: 'Ride downtown' },
    { merchant: 'Parking Garage', category: 'transport', amount: 15.00, description: 'Downtown parking' },
    { merchant: 'City Parking', category: 'transport', amount: 12.00, description: 'Parking fee' },

    // Home - 15 expenses
    { merchant: 'Home Depot', category: 'home', amount: 87.45, description: 'Hardware supplies' },
    { merchant: 'Home Depot', category: 'home', amount: 124.67, description: 'Paint and tools' },
    { merchant: 'Home Depot', category: 'home', amount: 56.32, description: 'Garden supplies' },
    { merchant: 'Lowes', category: 'home', amount: 98.76, description: 'Home improvement' },
    { merchant: 'Lowes', category: 'home', amount: 145.23, description: 'Bathroom fixtures' },
    { merchant: 'IKEA', category: 'home', amount: 234.56, description: 'Furniture' },
    { merchant: 'Bed Bath Beyond', category: 'home', amount: 67.89, description: 'Bedding and towels' },
    { merchant: 'Target', category: 'home', amount: 78.45, description: 'Home decor' },
    { merchant: 'HomeGoods', category: 'home', amount: 92.34, description: 'Home accessories' },
    { merchant: 'Ace Hardware', category: 'home', amount: 34.21, description: 'Hardware items' },
    { merchant: 'Home Depot', category: 'home', amount: 112.90, description: 'Plumbing supplies' },
    { merchant: 'Lowes', category: 'home', amount: 76.54, description: 'Electrical supplies' },
    { merchant: 'Wayfair', category: 'home', amount: 456.78, description: 'Online furniture order' },
    { merchant: 'Home Depot', category: 'home', amount: 43.21, description: 'Light bulbs and batteries' },
    { merchant: 'Lowes', category: 'home', amount: 89.32, description: 'Lawn care supplies' },

    // Fun/Entertainment - 20 expenses
    { merchant: 'AMC Theaters', category: 'fun', amount: 28.50, description: 'Movie tickets' },
    { merchant: 'AMC Theaters', category: 'fun', amount: 32.00, description: 'Movie and popcorn' },
    { merchant: 'Regal Cinemas', category: 'fun', amount: 26.75, description: 'Movie night' },
    { merchant: 'Netflix', category: 'fun', amount: 15.99, description: 'Streaming subscription' },
    { merchant: 'Spotify', category: 'fun', amount: 9.99, description: 'Music subscription' },
    { merchant: 'Amazon Prime Video', category: 'fun', amount: 8.99, description: 'Movie rental' },
    { merchant: 'Steam Games', category: 'fun', amount: 59.99, description: 'Video game' },
    { merchant: 'PlayStation Store', category: 'fun', amount: 39.99, description: 'Game purchase' },
    { merchant: 'Barnes & Noble', category: 'fun', amount: 34.56, description: 'Books' },
    { merchant: 'Amazon', category: 'fun', amount: 45.23, description: 'Board games' },
    { merchant: 'Dave & Busters', category: 'fun', amount: 67.89, description: 'Arcade and dinner' },
    { merchant: 'Six Flags', category: 'fun', amount: 89.00, description: 'Amusement park tickets' },
    { merchant: 'Local Concert Venue', category: 'fun', amount: 75.00, description: 'Concert tickets' },
    { merchant: 'The Art Museum', category: 'fun', amount: 25.00, description: 'Museum admission' },
    { merchant: 'Golf Course', category: 'fun', amount: 65.00, description: 'Golf round' },
    { merchant: 'Bowling Alley', category: 'fun', amount: 32.45, description: 'Bowling night' },
    { merchant: 'AMC Theaters', category: 'fun', amount: 29.50, description: 'Movies' },
    { merchant: 'Spotify', category: 'fun', amount: 9.99, description: 'Music subscription' },
    { merchant: 'Netflix', category: 'fun', amount: 15.99, description: 'Streaming service' },
    { merchant: 'Xbox Store', category: 'fun', amount: 49.99, description: 'Game download' },
  ]
};

// New user with minimal history (5 expenses)
const newUser = {
  userId: 'user-new-001',
  expenses: [
    { merchant: 'Starbucks', category: 'food', amount: 5.67, description: 'Morning coffee' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 45.32, description: 'Gas' },
    { merchant: 'Whole Foods Market', category: 'groceries', amount: 67.89, description: 'Groceries' },
    { merchant: 'Target', category: 'home', amount: 84.23, description: 'Household items' },
    { merchant: 'AMC Theaters', category: 'fun', amount: 28.50, description: 'Movie tickets' },
  ]
};

// User with repeated merchants (for exact matching tests)
const repeatedMerchantsUser = {
  userId: 'user-repeated-001',
  expenses: [
    // Starbucks visited 20 times - should learn strong association with 'food'
    { merchant: 'Starbucks', category: 'food', amount: 5.67, description: 'Coffee' },
    { merchant: 'Starbucks', category: 'food', amount: 6.32, description: 'Latte' },
    { merchant: 'Starbucks', category: 'food', amount: 4.89, description: 'Morning coffee' },
    { merchant: 'Starbucks', category: 'food', amount: 7.21, description: 'Coffee and pastry' },
    { merchant: 'Starbucks', category: 'food', amount: 5.43, description: 'Cappuccino' },
    { merchant: 'Starbucks', category: 'food', amount: 6.78, description: 'Coffee' },
    { merchant: 'Starbucks', category: 'food', amount: 5.21, description: 'Latte' },
    { merchant: 'Starbucks', category: 'food', amount: 7.89, description: 'Breakfast' },
    { merchant: 'Starbucks', category: 'food', amount: 4.56, description: 'Coffee' },
    { merchant: 'Starbucks', category: 'food', amount: 6.12, description: 'Iced coffee' },
    { merchant: 'Starbucks', category: 'food', amount: 5.98, description: 'Mocha' },
    { merchant: 'Starbucks', category: 'food', amount: 7.34, description: 'Coffee and muffin' },
    { merchant: 'Starbucks', category: 'food', amount: 5.23, description: 'Coffee' },
    { merchant: 'Starbucks', category: 'food', amount: 6.45, description: 'Latte' },
    { merchant: 'Starbucks', category: 'food', amount: 4.87, description: 'Espresso' },
    { merchant: 'Starbucks', category: 'food', amount: 7.12, description: 'Breakfast sandwich' },
    { merchant: 'Starbucks', category: 'food', amount: 5.76, description: 'Coffee' },
    { merchant: 'Starbucks', category: 'food', amount: 6.89, description: 'Frappuccino' },
    { merchant: 'Starbucks', category: 'food', amount: 5.34, description: 'Coffee' },
    { merchant: 'Starbucks', category: 'food', amount: 7.56, description: 'Breakfast' },

    // Shell Gas Station visited 15 times - strong association with 'transport'
    { merchant: 'Shell Gas Station', category: 'transport', amount: 45.67, description: 'Gas' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 42.34, description: 'Gasoline' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 48.92, description: 'Gas fill-up' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 43.21, description: 'Gas' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 47.89, description: 'Gasoline' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 44.56, description: 'Gas' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 46.23, description: 'Gas fill-up' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 41.78, description: 'Gasoline' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 49.12, description: 'Gas' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 43.89, description: 'Gas fill-up' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 45.34, description: 'Gasoline' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 47.23, description: 'Gas' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 42.67, description: 'Gas fill-up' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 48.45, description: 'Gasoline' },
    { merchant: 'Shell Gas Station', category: 'transport', amount: 44.91, description: 'Gas' },

    // Home Depot visited 10 times - association with 'home'
    { merchant: 'Home Depot', category: 'home', amount: 87.45, description: 'Hardware' },
    { merchant: 'Home Depot', category: 'home', amount: 124.67, description: 'Paint supplies' },
    { merchant: 'Home Depot', category: 'home', amount: 56.32, description: 'Tools' },
    { merchant: 'Home Depot', category: 'home', amount: 98.76, description: 'Lumber' },
    { merchant: 'Home Depot', category: 'home', amount: 145.23, description: 'Home improvement' },
    { merchant: 'Home Depot', category: 'home', amount: 67.89, description: 'Garden supplies' },
    { merchant: 'Home Depot', category: 'home', amount: 112.34, description: 'Plumbing' },
    { merchant: 'Home Depot', category: 'home', amount: 78.45, description: 'Electrical' },
    { merchant: 'Home Depot', category: 'home', amount: 92.56, description: 'Hardware' },
    { merchant: 'Home Depot', category: 'home', amount: 134.21, description: 'Renovation supplies' },
  ]
};

// User with varied keyword-rich descriptions
const keywordRichUser = {
  userId: 'user-keywords-001',
  expenses: [
    // Groceries keywords
    { merchant: 'Local Market', category: 'groceries', amount: 45.32, description: 'Fresh vegetables and fruits' },
    { merchant: 'Corner Store', category: 'groceries', amount: 23.45, description: 'Milk, eggs, and bread' },
    { merchant: 'Farmers Market', category: 'groceries', amount: 34.56, description: 'Organic produce' },
    { merchant: 'Quick Mart', category: 'groceries', amount: 12.34, description: 'Snacks and drinks' },
    { merchant: 'Food Bazaar', category: 'groceries', amount: 78.90, description: 'Weekly grocery shopping' },

    // Food/dining keywords
    { merchant: 'Joes Diner', category: 'food', amount: 15.67, description: 'Lunch burger and fries' },
    { merchant: 'Coffee Corner', category: 'food', amount: 6.23, description: 'Breakfast coffee and bagel' },
    { merchant: 'Thai Palace', category: 'food', amount: 42.34, description: 'Dinner pad thai and spring rolls' },
    { merchant: 'Pizza Place', category: 'food', amount: 24.56, description: 'Takeout pizza' },
    { merchant: 'Sushi Bar', category: 'food', amount: 56.78, description: 'Sushi dinner' },

    // Transport keywords
    { merchant: 'Quick Gas', category: 'transport', amount: 48.23, description: 'Fuel for car' },
    { merchant: 'City Ride', category: 'transport', amount: 14.56, description: 'Rideshare to office' },
    { merchant: 'Metro Card', category: 'transport', amount: 30.00, description: 'Public transit pass' },
    { merchant: 'Auto Service', category: 'transport', amount: 125.00, description: 'Oil change and car maintenance' },
    { merchant: 'Parking Lot', category: 'transport', amount: 18.00, description: 'Airport parking' },

    // Home keywords
    { merchant: 'Hardware Plus', category: 'home', amount: 67.89, description: 'Light fixtures and bulbs' },
    { merchant: 'Furniture Store', category: 'home', amount: 345.00, description: 'New sofa for living room' },
    { merchant: 'Garden Center', category: 'home', amount: 54.32, description: 'Plants and fertilizer' },
    { merchant: 'Paint Shop', category: 'home', amount: 89.45, description: 'Interior paint and brushes' },
    { merchant: 'Cleaning Supplies Co', category: 'home', amount: 32.10, description: 'Cleaning products' },

    // Fun/entertainment keywords
    { merchant: 'Game World', category: 'fun', amount: 59.99, description: 'New video game' },
    { merchant: 'Theater District', category: 'fun', amount: 85.00, description: 'Broadway show tickets' },
    { merchant: 'Book Nook', category: 'fun', amount: 28.45, description: 'Novel and magazine' },
    { merchant: 'Sports Arena', category: 'fun', amount: 120.00, description: 'Basketball game tickets' },
    { merchant: 'Hobby Shop', category: 'fun', amount: 43.21, description: 'Art supplies and crafts' },
  ]
};

// Empty user (no history)
const emptyUser = {
  userId: 'user-empty-001',
  expenses: []
};

module.exports = {
  experiencedUser,
  newUser,
  repeatedMerchantsUser,
  keywordRichUser,
  emptyUser
};
