Feature: STORY-2 Admin generates a shareable link
  As an admin
  I want to generate a shareable link once the menu is ready
  So I can distribute it to the team

  Background:
    Given the application is running
    And the admin has started an order for "Trattoria Demo"
    And the admin is on the order admin page

  Scenario: AC1 - The generate-link action is unavailable until the menu has an item
    Given the menu has no items
    Then the generate share link action is disabled
    When the admin adds a menu item "Margherita"
    Then the generate share link action is enabled

  Scenario: AC2 - Generating produces a shareable URL containing the order identifier
    Given the menu has at least one item
    When the admin generates the share link
    Then a shareable URL is displayed
    And the URL contains the order identifier
    And the URL points to the guest order view

  Scenario: AC3 - The URL is read-only and can be copied with a confirmation
    Given the admin has generated the share link
    Then the URL is shown in a read-only field
    When the admin taps the copy button
    Then the full URL is copied to the clipboard
    And a "Copied" confirmation is shown

  Scenario: AC4 - Opening the link in a new session loads the guest view with the same restaurant and menu
    Given the admin has added the items "Margherita" and "Garlic Bread"
    When a teammate opens the shared link in a new browser session
    Then the guest order view is shown for that order
    And the restaurant name "Trattoria Demo" is displayed
    And the items "Margherita" and "Garlic Bread" are listed
    And the teammate cannot remove any item

  Scenario: AC5 - After generating, the order is open and persists across a refresh
    Given the admin has generated the share link
    When the guest order view is refreshed
    Then the menu items are still shown
    And the order state is still open

  Scenario: Edge case - Opening an unknown order link shows an error state
    When someone opens a guest link for an order that does not exist
    Then an error state is shown instead of the menu
    And the application does not crash
