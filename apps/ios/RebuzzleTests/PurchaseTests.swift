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

extension PurchaseTests {
    @MainActor func testPendingPurchaseDoesNotUnlockUntilApproval() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.askToBuyEnabled = true
        session.clearTransactions()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = PurchaseStore()
        await store.load()
        await store.purchase()
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertTrue(store.message?.contains("awaiting approval") == true)
        let pending = try XCTUnwrap(session.allTransactions().first)
        try session.approveAskToBuyTransaction(identifier: pending.identifier)
        for _ in 0..<50 {
            if store.hasPlus { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTAssertTrue(store.hasPlus, "Transaction updates unlock the approved purchase without relaunch")
    }

    @MainActor func testFailedPurchaseKeepsFreeAccessAndAllowsAnotherAttempt() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = PurchaseStore()
        await store.load()
        try await session.setSimulatedError(.generic(.notAvailableInStorefront), forAPI: .purchase)
        await store.purchase()
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertNotNil(store.message)
        let firstCount = session.allTransactions().count
        await store.purchase()
        XCTAssertFalse(store.busy)
        XCTAssertFalse(store.hasPlus)
        XCTAssertGreaterThan(session.allTransactions().count, firstCount, "A failed purchase releases the busy gate so another attempt reaches StoreKit")
    }
}
