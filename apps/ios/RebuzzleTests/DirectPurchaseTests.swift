import XCTest
import StoreKitTest
@testable import Rebuzzle

final class DirectPurchaseTests: XCTestCase {
    @MainActor func testDirectPurchaseGrantsVerifiedPlus() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = PurchaseStore()
        await store.load()
        XCTAssertNotNil(store.product)
        XCTAssertFalse(store.hasPlus)
        await store.purchase()
        XCTAssertFalse(store.busy)
        XCTAssertTrue(store.hasPlus, "Direct purchase should unlock Plus: \(store.message ?? "No message")")
        XCTAssertTrue(store.message?.contains("Welcome to Plus") == true)
    }

    @MainActor func testDirectPurchaseCanRetryAfterStorefrontFailure() async throws {
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
        // Clearing a simulated purchase error with nil leaves the local StoreKit server
        // returning an unknown error. Reset only session overrides; keep store and transactions.
        session.resetToDefaultState()
        session.disableDialogs = true
        await store.purchase()
        XCTAssertTrue(store.hasPlus, "Direct retry should unlock Plus: \(store.message ?? "No message")")
        XCTAssertFalse(store.busy)
    }

    @MainActor func testCancelledPurchaseDoesNotUnlockOrReportFailure() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = PurchaseStore()
        await store.load()
        XCTAssertNotNil(store.product)
        try await session.setSimulatedError(.generic(.userCancelled), forAPI: .purchase)
        await store.purchase()
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertNil(store.message, "Cancelling is a normal choice, not a failed purchase.")
    }

    @MainActor func testStoreLoadRecoveryClearsUnavailableMessage() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = PurchaseStore()
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .loadProducts)
        await store.load()
        XCTAssertNil(store.product)
        XCTAssertNotNil(store.message)
        XCTAssertFalse(store.hasPlus)
        session.resetToDefaultState()
        session.disableDialogs = true
        await store.load()
        XCTAssertNotNil(store.product)
        XCTAssertNil(store.message, "An available upgrade must not retain the previous connection error.")
    }


    @MainActor func testUnavailableProductCannotStartPurchase() async throws {
        let source = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        var configuration = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: source)) as? [String: Any])
        configuration["products"] = []
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".storekit")
        try JSONSerialization.data(withJSONObject: configuration).write(to: url)
        defer { try? FileManager.default.removeItem(at: url) }
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = PurchaseStore()
        await store.load()
        XCTAssertNil(store.product)
        XCTAssertNotNil(store.message)
        await store.purchase()
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertTrue(session.allTransactions().isEmpty)
    }

}
