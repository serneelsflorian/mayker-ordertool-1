Feature: STORY-1 Admin starts a group order and enters the menu
  As an admin
  I want to start a group order for the preselected restaurant and enter its menu items
  So the team has an accurate list to order from

  Background:
    Given the application is running with an empty database
    And the admin opens the application at the root URL
    And the app creates a new order and redirects to /order/:id

  Scenario: AC1 - Restaurant name is shown and the form is empty on load
    Given the admin is on the order admin page
    When the page finishes loading
    Then the restaurant name "Trattoria Demo" is displayed in the top bar
    And the menu item name input is empty
    And the menu item price input is empty
    And the menu item category input is empty
    And the item list shows the empty state message

  Scenario: AC2 - Admin adds a menu item with name only (price is optional)
    Given the admin is on the order admin page
    When the admin enters "Garlic Bread" in the item name field
    And the admin clicks the Add button
    Then the item "Garlic Bread" appears in the menu item list
    And no price is shown for that item

  Scenario: AC2 - Admin adds a menu item with name, price, and category
    Given the admin is on the order admin page
    When the admin enters "Margherita" in the item name field
    And the admin enters "9.50" in the price field
    And the admin enters "Pizza" in the category field
    And the admin clicks the Add button
    Then the item "Margherita" appears in the menu item list
    And the price "€9.50" is shown for that item
    And the category "Pizza" is shown as a badge for that item

  Scenario: AC3 - Empty name shows an inline error and does not add the item
    Given the admin is on the order admin page
    And the name field is empty
    When the admin clicks the Add button
    Then an inline error appears under the name field
    And no new item is added to the list

  Scenario: AC3 - Non-numeric price shows an inline error and does not add the item
    Given the admin is on the order admin page
    When the admin enters "Bruschetta" in the item name field
    And the admin enters "abc" in the price field
    And the admin clicks the Add button
    Then an inline error appears under the price field
    And no new item is added to the list

  Scenario: AC3 - Negative price shows an inline error and does not add the item
    Given the admin is on the order admin page
    When the admin enters "Bruschetta" in the item name field
    And the admin enters "-5" in the price field
    And the admin clicks the Add button
    Then an inline error appears under the price field
    And no new item is added to the list

  Scenario: AC4 - Added item appears immediately showing name and optional fields
    Given the admin is on the order admin page
    When the admin adds an item with name "Carbonara", price "13.50", and category "Pasta"
    Then the item appears immediately in the list without a page reload
    And the item shows the name "Carbonara"
    And the item shows the price "€13.50"
    And the item shows the category badge "Pasta"

  Scenario: AC5 - Admin can remove an item and the list updates immediately
    Given the admin is on the order admin page with two items already in the list
    When the admin removes the first item
    Then the first item disappears from the list immediately
    And the second item remains in the list

  Scenario: AC6 - Generate share link button is disabled until at least one item exists
    Given the admin is on the order admin page with an empty menu
    Then the generate share link button is disabled
    When the admin adds one valid menu item
    Then the generate share link button becomes enabled

  Scenario: AC6 - Generate share link button is re-disabled after the last item is removed
    Given the admin is on the order admin page with exactly one item in the menu
    And the generate share link button is enabled
    When the admin removes that item
    Then the generate share link button becomes disabled again

  Scenario: Edge case - Invalid price rejected even when 3 or more decimal places are entered
    Given the admin is on the order admin page
    When the admin enters "Tiramisu" in the item name field
    And the admin enters "6.999" in the price field
    And the admin clicks the Add button
    Then an inline error appears under the price field
    And no new item is added to the list
