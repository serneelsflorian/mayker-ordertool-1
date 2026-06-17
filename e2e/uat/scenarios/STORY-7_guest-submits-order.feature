Feature: STORY-7 Guest submits their order
  As a guest with the share link
  I want to submit my order when I am done
  So the organizer knows my selections are final, with the option to reopen and edit

  Background:
    Given an open order exists for "Trattoria Demo"
    And the menu contains "Margherita" priced at "9.50"
    And the guest "Sara" has joined the order

  Scenario: AC1 Submit button is visible while the order is open
    Given Sara has added "Margherita" to her order
    When Sara views her "My order" panel
    Then she sees a "Submit my order" button

  Scenario: AC2 Submit is disabled until at least one item is added
    Given Sara has not added any items
    When Sara views her "My order" panel
    Then the "Submit my order" button is disabled
    When Sara adds "Margherita" to her order
    Then the "Submit my order" button becomes enabled

  Scenario: AC3 Submitting sets status to Submitted and shows a confirmation banner
    Given Sara has added "Margherita" to her order
    When Sara clicks "Submit my order"
    Then her status badge changes to "Submitted"
    And a confirmation banner appears stating her order is submitted and the organizer can see it
    And the banner offers a "Reopen / edit my order" option

  Scenario: AC4 A submitted guest can reopen to return to Editing
    Given Sara has submitted her order
    When Sara clicks "Reopen / edit my order"
    Then her status badge changes back to "Editing"
    And the "Submit my order" button is visible again

  Scenario: AC5 Editing an item after submitting automatically reverts status to Editing
    Given Sara has submitted her order
    When Sara changes the quantity of an item without clicking reopen
    Then her status badge automatically changes to "Editing"
    And the "Submit my order" button reappears without any manual reopen step

  Scenario: AC6 Guest status is visible in the admin overview
    Given Sara has submitted her order
    And "Bob" has joined but not submitted
    When the admin views the order overview
    Then Sara is shown with the "Submitted" badge
    And Bob is shown with the "Editing" badge
    And the summary reads "1 of 2 submitted"

  Scenario: AC7 Closed order disables submit and reopen controls
    Given the order has been closed by the admin
    When Sara opens the guest link
    Then she sees the order-closed message
    And there is no "Submit my order" button
    And there is no "Reopen / edit my order" button

  Scenario: Edge case Submitting and reopening multiple times stays consistent
    Given Sara has added "Margherita" to her order
    When Sara submits, then reopens, then submits again
    Then her final status is "Submitted"
    And the confirmation banner is shown each time she submits
