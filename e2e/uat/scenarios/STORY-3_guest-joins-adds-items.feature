Feature: STORY-3 A guest joins via the link and adds items
  As anyone with the share link
  I want to open it, enter my name, and add menu items with optional notes
  So that my meal is included and attributed to me

  Background:
    Given an open order exists for "Trattoria Demo"
    And the menu contains "Margherita" priced at "9.50"
    And the menu contains "Tap Water" with no price

  Scenario: AC1 Opening the link shows the restaurant and menu with no login
    When a guest opens the shared link
    Then they see the restaurant name "Trattoria Demo"
    And they see the full menu as selectable items
    And they are not asked to log in or create an account

  Scenario: AC2 A name is required before ordering
    When a guest opens the shared link
    Then the join button is disabled while the name field is empty
    And no per-item add controls are shown
    When the guest enters the name "Sara"
    Then the join button becomes enabled
    And after joining the per-item add controls appear

  Scenario: AC3 Added items are attributed to the guest
    Given the guest "Sara" has joined the order
    When she adds "Margherita" to her order
    Then "Margherita" appears in her order
    And the item is attributed to "Sara"

  Scenario: AC4 A per-item note is optional and saved
    Given the guest "Sara" has joined and added "Margherita"
    When she enters the note "no onions" on that item and moves focus away
    Then the note "no onions" is saved to that item
    And the note is still present after reloading the page

  Scenario: AC5 Quantity can be adjusted with a minimum of 1 and items removed
    Given the guest "Sara" has joined and added "Margherita"
    Then the decrease-quantity control is disabled at quantity 1
    When she increases the quantity to 2
    Then the quantity shows 2
    When she removes the item
    Then the item no longer appears in her order

  Scenario: AC6 The subtotal reflects only the guest's own selections
    Given the guest "Sara" has joined the order
    When she adds "Margherita" priced at "9.50"
    Then her subtotal is "€9.50"
    When she also adds "Tap Water" which has no price
    Then her subtotal remains "€9.50" because unpriced items count as 0

  Scenario: AC7 A guest cannot see or change another guest's items
    Given the guest "Bob" has added "Margherita" to his order
    When the guest "Alice" opens the link and joins
    Then Alice does not see Bob's "Margherita"
    And Alice cannot edit or remove Bob's items

  Scenario: AC8 A newly joined guest has the status Editing
    When the guest "Sara" joins the order
    Then her status is shown as "Editing"

  Scenario: AC9 A closed order is read-only
    Given the order has been closed
    When a guest opens the shared link
    Then a message states the order is closed
    And the menu is shown read-only with no add, edit, or remove controls

  Scenario: Edge case Opening an unknown order link shows an error
    When a guest opens a link for an order that does not exist
    Then an error state is shown instead of a crash
