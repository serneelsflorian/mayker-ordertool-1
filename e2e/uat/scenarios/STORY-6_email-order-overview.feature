Feature: STORY-6 Admin emails the order overview (demo prank)
  As an admin
  I want to email the consolidated order overview to a recipient with optional CC and BCC once the order is closed
  So that the team gets a copy, with a clearly tongue-in-cheek "the bill is coming" message for the demo

  Background:
    Given an order exists for "Trattoria Demo"
    And the menu contains "Margherita" priced at "9.50"

  Scenario: AC1 The email action is available only once the order is closed
    Given the order is open
    When the admin opens the admin view
    Then no email overview action is shown
    When the admin closes the order
    Then the email overview action is shown alongside the export

  Scenario: AC2 The recipient is required and CC and BCC are optional but validated
    Given the admin has closed the order
    When the admin opens the admin view
    And the admin enters "alice@example.com" as the recipient
    And the admin enters "bad-cc" as the CC
    And the admin sends the email
    Then an inline error is shown on the CC field
    And the email is not sent

  Scenario: AC3 Sending with an empty recipient shows an inline error and does not send
    Given the admin has closed the order
    When the admin opens the admin view
    And the admin leaves the recipient empty
    And the admin sends the email
    Then an inline error is shown on the recipient field
    And the email is not sent

  Scenario: AC4 The email body contains the full consolidated overview from Story 5
    Given the guest "Sara" has added 2 "Margherita"
    And the admin has closed the order
    When the admin opens the admin view
    Then the email preview shows the header "Trattoria Demo"
    And the email preview shows the line "2x Margherita"
    And the email preview shows "Total: €19.00"

  Scenario: AC5 The body includes a clearly playful prank line
    Given the admin has closed the order
    When the admin opens the admin view
    Then the email preview contains a line stating the bill will be sent to the recipient's email shortly
    And the line reads as an obvious joke rather than a real invoice

  Scenario: AC6 Sending confirms success and leaves the closed order unchanged
    Given the guest "Sara" has added 1 "Margherita"
    And the admin has closed the order
    When the admin opens the admin view
    And the admin enters "alice@example.com" as the recipient
    And the admin sends the email
    Then a "Sent" confirmation is shown
    And the order remains closed

  Scenario: AC7 CC and BCC recipients receive the same email with BCC hidden
    Given the admin has closed the order
    When the admin opens the admin view
    And the admin enters "alice@example.com" as the recipient
    And the admin enters "boss@example.com" as the CC
    And the admin enters "audit@example.com" as the BCC
    And the admin sends the email
    Then the recipient and the CC receive the email with both addresses visible
    And the BCC recipient receives the email without appearing in the visible recipients

  Scenario: Edge case A closed order with no selections can still be emailed
    Given no guest has added any item
    And the admin has closed the order
    When the admin opens the admin view
    Then the email preview shows the header "Trattoria Demo"
    And the email preview shows "Total: €0.00"
    When the admin enters "alice@example.com" as the recipient
    And the admin sends the email
    Then a "Sent" confirmation is shown
