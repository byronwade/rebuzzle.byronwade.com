import XCTest
import StoreKit
@testable import Rebuzzle

/// StoreKit Test shares one local transaction store across tests, and clearing or
/// adding transactions reaches `Transaction.currentEntitlements` asynchronously.
/// Poll StoreKit directly so leftovers from an earlier test (or a purchase that has
/// not been published yet) fail as a precondition instead of as app behavior.
extension XCTestCase {
    @MainActor func waitForPlusEntitlement(
        present: Bool,
        timeout: Duration = .seconds(10),
        file: StaticString = #filePath,
        line: UInt = #line
    ) async throws {
        let deadline = ContinuousClock.now + timeout
        while ContinuousClock.now < deadline {
            if await hasActivePlusEntitlement() == present { return }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTFail(
            present
                ? "StoreKit Test never published the Plus purchase as a current entitlement."
                : "A Plus entitlement from an earlier test was still active after clearing transactions.",
            file: file, line: line
        )
    }

    @MainActor private func hasActivePlusEntitlement() async -> Bool {
        for await result in Transaction.currentEntitlements {
            let transaction: Transaction
            switch result {
            case .verified(let value), .unverified(let value, _): transaction = value
            }
            if transaction.productID == PurchaseStore.plusID, transaction.revocationDate == nil { return true }
        }
        return false
    }
}
