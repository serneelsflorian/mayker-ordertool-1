Feature: STORY-5 Admin exports the consolidated order
  As an admin
  I want a consolidated export grouped by item with quantities and notes
  So that I can re-enter the order into Deliveroo quickly

  Background:
    Given an order exists for "Trattoria Demo"
    And the menu contains "Margherita" priced at "9.50"

  Scenario: AC1 The export action is available only once the order is closed
    Given the order is open
    When the admin opens the admin view
    Then no consolidated export is shown
    When the admin closes the order
    Then the consolidated export is shown

  Scenario: AC2 Identical items are grouped as quantity x item name
    Given the guest "Sara" has added 1 "Margherita"
    And the guest "Tom" has added 1 "Margherita"
    And the admin has closed the order
    When the admin opens the admin view
    Then the export shows the line "2x Margherita"
    And the export does not list selections per person

  Scenario: AC3 Items merge only when item and note match, otherwise stay separate with the note beneath
    Given the guest "Sara" has added 2 "Margherita" with no note
    And the guest "Mira" has added 1 "Margherita" with the note "no onions"
    And the admin has closed the order
    When the admin opens the admin view
    Then the export shows the line "2x Margherita"
    And the export shows a separate line "1x Margherita"
    And the note "no onions" is shown beneath that line

  Scenario: AC4 The export shows a final total summing all selections with price-less items as zero
    Given the menu also contains "Tap Water" with no price
    And the guest "Sara" has added 2 "Margherita" and 3 "Tap Water"
    And the admin has closed the order
    When the admin opens the admin view
    Then the export shows "Total: €19.00"

  Scenario: AC5 The copy-all button copies the entire export to the clipboard
    Given the guest "Sara" has added 1 "Margherita"
    And the admin has closed the order
    When the admin opens the admin view
    And the admin taps the copy-all button
    Then a copied confirmation is shown
    And the clipboard contains the restaurant header, the grouped lines, and the total

  Scenario: AC6 The export includes the restaurant name as a header
    Given the admin has closed the order
    When the admin opens the admin view
    Then the export begins with the header "Trattoria Demo"

  Scenario: Edge case A closed order with no selections shows the header and a zero total
    Given no guest has added any item
    And the admin has closed the order
    When the admin opens the admin view
    Then the export begins with the header "Trattoria Demo"
    And the export shows "Total: €0.00"
