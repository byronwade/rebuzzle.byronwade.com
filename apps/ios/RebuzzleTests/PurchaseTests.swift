import XCTest
import StoreKitTest
@testable import Rebuzzle

final class PurchaseTests: XCTestCase {
    @MainActor func testVerifiedPurchaseGrantsAccessAndRefundRevokesIt() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.disableDialogs = true
        session.clearTransactions()
        defer { session.clearTransactions() }
        let store = PurchaseStore()
        await store.load()
        XCTAssertNotNil(store.product)
        XCTAssertFalse(store.hasPlus)
        let transaction = try await session.buyProduct(identifier: PurchaseStore.plusID)
        for _ in 0..<50 {
            await store.refreshEntitlements()
            if store.hasPlus { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTAssertTrue(store.hasPlus)
        let relaunched = PurchaseStore()
        await relaunched.refreshEntitlements()
        XCTAssertTrue(relaunched.hasPlus, "Verified ownership survives relaunch")
        try session.refundTransaction(identifier: UInt(transaction.id))
        for _ in 0..<50 {
            await store.refreshEntitlements()
            if !store.hasPlus { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTAssertFalse(store.hasPlus)
    }
}
