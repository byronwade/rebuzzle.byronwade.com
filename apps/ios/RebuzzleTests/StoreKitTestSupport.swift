import XCTest
import StoreKit
@testable import Rebuzzle

/// StoreKit Test shares one local transaction store across tests, and clearing or
/// adding transactions reaches `Transaction.currentEntitlements` asynchronously.
/// Poll StoreKit directly so leftovers from an earlier test (or a purchase that has
/// not been published yet) fail as a precondition instead of as app behavior.
///
/// Every read is bounded: a StoreKit query that never returns must fail this test
/// quickly, not stall the whole suite until the CI job times out.
extension XCTestCase {
    @MainActor func waitForPlusEntitlement(
        present: Bool,
        timeout: Duration = .seconds(10),
        file: StaticString = #filePath,
        line: UInt = #line
    ) async throws {
        let productID = PurchaseStore.plusID
        let clock = ContinuousClock()
        let deadline = clock.now + timeout
        var unanswered = 0
        while clock.now < deadline {
            let remaining = deadline - clock.now
            switch await StoreKitEntitlementProbe.isActive(productID, within: min(remaining, .seconds(3))) {
            case .some(let active) where active == present:
                return
            case .some:
                break
            case .none:
                unanswered += 1
            }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTFail(
            unanswered > 0 && !present
                ? "StoreKit did not answer an entitlement query \(unanswered) time(s) within \(timeout)."
                : present
                    ? "StoreKit Test never published the Plus purchase as a current entitlement."
                    : "A Plus entitlement from an earlier test was still active after clearing transactions.",
            file: file, line: line
        )
    }
}

enum StoreKitEntitlementProbe {
    /// Returns nil when StoreKit does not finish the query within `limit`.
    static func isActive(_ productID: String, within limit: Duration) async -> Bool? {
        await withCheckedContinuation { continuation in
            let gate = ResumeOnce(continuation)
            Task { await gate.resume(with: await hasActiveEntitlement(productID)) }
            Task {
                try? await Task.sleep(for: limit)
                await gate.resume(with: nil)
            }
        }
    }

    private static func hasActiveEntitlement(_ productID: String) async -> Bool {
        for await result in Transaction.currentEntitlements {
            let transaction: Transaction
            switch result {
            case .verified(let value), .unverified(let value, _): transaction = value
            }
            if transaction.productID == productID, transaction.revocationDate == nil { return true }
        }
        return false
    }

    private actor ResumeOnce {
        private var continuation: CheckedContinuation<Bool?, Never>?
        init(_ continuation: CheckedContinuation<Bool?, Never>) { self.continuation = continuation }
        func resume(with value: Bool?) {
            continuation?.resume(returning: value)
            continuation = nil
        }
    }
}
