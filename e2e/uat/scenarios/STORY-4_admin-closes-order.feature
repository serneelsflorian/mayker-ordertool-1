Feature: STORY-4 Admin closes the order
  As an admin
  I want to close the order when everyone's done
  So that the list is final

  Background:
    Given an open order exists for "Trattoria Demo"
    And the menu contains "Margherita" priced at "9.50"

  Scenario: AC1 The close-order action is available while the order is open
    When the admin opens the admin view
    Then a "Close order" action is visible

  Scenario: AC2 The overview groups selections by guest with status and a submitted summary
    Given the guest "Alice" has added "Margherita" with quantity 2 and the note "no onions"
    And the guest "Bob" has joined but added nothing
    When the admin opens the admin view
    Then the overview shows "Alice" with the line "2x Margherita — no onions"
    And "Alice" has a status badge of "Editing"
    And the overview shows "Bob"
    And the summary indicator reads "0 of 2 submitted"

  Scenario: AC3 Closing the order sets it to closed and persists
    When the admin chooses "Close order" and confirms
    Then the order is shown as closed
    And the order is still closed after the page is refreshed

  Scenario: AC4 A closed order disables guest controls for everyone after refresh
    Given the guest "Sara" has joined the order
    And the admin has closed the order
    When "Sara" reloads the shared link
    Then a message states the order is closed
    And no add, edit, or remove controls are available
    And any attempt to change the order is rejected

  Scenario: AC5 A confirmation prompt guards closing and editing guests still count
    Given the guest "Dana" has added "Margherita" while still in "Editing" status
    When the admin chooses "Close order"
    Then a confirmation prompt appears stating "Members can no longer make changes"
    When the admin cancels the prompt
    Then the order remains open
    And "Dana"'s in-progress item is still shown in the overview

  Scenario: AC6 A closed order cannot be reopened from the UI
    Given the admin has closed the order
    When the admin opens the admin view
    Then there is no option to reopen the order

  Scenario: Edge case The overview shows an empty state when no guests have joined
    When the admin opens the admin view
    Then the overview states that no guests have joined yet
    And the summary indicator reads "0 of 0 submitted"
