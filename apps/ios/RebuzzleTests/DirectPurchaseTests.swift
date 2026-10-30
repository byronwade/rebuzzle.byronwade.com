import XCTest
import StoreKit
import StoreKitTest
@testable import Rebuzzle

final class DirectPurchaseTests: XCTestCase {
    @MainActor private func isolatedPurchaseStore(monitorsStoreKit: Bool = true) -> PurchaseStore {
        PurchaseStore(
            defaults: UserDefaults(suiteName: "rebuzzle.direct-purchase-tests.\(UUID().uuidString)")!,
            monitorsStoreKit: monitorsStoreKit
        )
    }

    @MainActor func testDirectPurchaseGrantsVerifiedPlus() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        try await waitForPlusEntitlement(present: false)
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = isolatedPurchaseStore()
        var events = [[String: String]]()
        store.onGrowthEvent = { events.append($0.payload) }
        store.onVerifiedPurchase = { _, _ in true }
        await store.load()
        XCTAssertNotNil(store.product)
        XCTAssertFalse(store.hasPlus)
        await store.purchase(source: .archive)
        XCTAssertFalse(store.busy)
        XCTAssertTrue(store.hasPlus, "Direct purchase should unlock Plus: \(store.message ?? "No message")")
        XCTAssertTrue(store.message?.contains("Welcome to Plus") == true)
        XCTAssertEqual(events, [
            ["eventType": "plus_purchase_started", "source": "archive"],
            ["eventType": "plus_purchase_verified", "source": "archive"],
        ])
    }

    @MainActor func testDirectPurchaseCanRetryAfterStorefrontFailure() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        try await waitForPlusEntitlement(present: false)
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = isolatedPurchaseStore()
        var events = [[String: String]]()
        store.onGrowthEvent = { events.append($0.payload) }
        store.onVerifiedPurchase = { _, _ in true }
        await store.load()
        try await session.setSimulatedError(.generic(.notAvailableInStorefront), forAPI: .purchase)
        await store.purchase(source: .settings)
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertEqual(Array(events.prefix(2)), [
            ["eventType": "plus_purchase_started", "source": "settings"],
            ["eventType": "plus_purchase_failed", "source": "settings"],
        ])
        // Clearing a simulated purchase error with nil leaves the local StoreKit server
        // returning an unknown error. Reset only session overrides; keep store and transactions.
        session.resetToDefaultState()
        session.disableDialogs = true
        await store.purchase(source: .settings)
        XCTAssertTrue(store.hasPlus, "Direct retry should unlock Plus: \(store.message ?? "No message")")
        XCTAssertFalse(store.busy)
        XCTAssertEqual(events, [
            ["eventType": "plus_purchase_started", "source": "settings"],
            ["eventType": "plus_purchase_failed", "source": "settings"],
            ["eventType": "plus_purchase_started", "source": "settings"],
            ["eventType": "plus_purchase_verified", "source": "settings"],
        ])
    }

    @MainActor func testCancelledPurchaseDoesNotUnlockOrReportFailure() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        try await waitForPlusEntitlement(present: false)
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = isolatedPurchaseStore()
        var events = [[String: String]]()
        store.onGrowthEvent = { events.append($0.payload) }
        await store.load()
        XCTAssertNotNil(store.product)
        try await session.setSimulatedError(.generic(.userCancelled), forAPI: .purchase)
        await store.purchase(source: .journeyInsights)
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertNil(store.message, "Cancelling is a normal choice, not a failed purchase.")
        XCTAssertEqual(events, [
            ["eventType": "plus_purchase_started", "source": "journey_insights"],
            ["eventType": "plus_purchase_cancelled", "source": "journey_insights"],
        ])
    }

    @MainActor func testStoreLoadRecoveryClearsUnavailableMessage() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        try await waitForPlusEntitlement(present: false)
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = isolatedPurchaseStore()
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
        try await waitForPlusEntitlement(present: false)
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = isolatedPurchaseStore()
        await store.load()
        XCTAssertNil(store.product)
        XCTAssertNotNil(store.message)
        await store.purchase(source: .journal)
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertTrue(session.allTransactions().isEmpty)
    }

}

extension DirectPurchaseTests {
    @MainActor private func restoreSession() async throws -> SKTestSession {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        try await waitForPlusEntitlement(present: false)
        return session
    }

    @MainActor func testExplicitRestoreRecoversVerifiedOwnership() async throws {
        let session = try await restoreSession()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        _ = try await session.buyProduct(identifier: PurchaseStore.plusID)
        let store = isolatedPurchaseStore()
        var events = [[String: String]]()
        store.onGrowthEvent = { events.append($0.payload) }
        await store.restore()
        XCTAssertTrue(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertEqual(store.message, "Plus restored.")
        XCTAssertEqual(events, [["eventType": "plus_restore_completed"]])
    }

    @MainActor func testFreshStoreDiscoversExistingOwnershipWithoutWaitingForDailyLoad() async throws {
        let session = try await restoreSession()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let transaction = try await session.buyProduct(identifier: PurchaseStore.plusID)
        await transaction.finish()

        // Simulate a cold app launch after the purchase has already been completed.
        let relaunched = isolatedPurchaseStore()
        for _ in 0..<50 {
            if relaunched.hasPlus { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTAssertTrue(relaunched.hasPlus, "Existing verified Plus ownership should load immediately, without an API or Plus-screen visit")
    }

    @MainActor func testProductReloadPreservesExplicitRestoreOutcome() async throws {
        let session = try await restoreSession()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        _ = try await session.buyProduct(identifier: PurchaseStore.plusID)
        let store = isolatedPurchaseStore()
        await store.restore()
        XCTAssertEqual(store.message, "Plus restored.")
        // PlusView and app startup both load products asynchronously. Their completion
        // must not erase the outcome of an explicit restore action.
        await store.load()
        XCTAssertNotNil(store.product)
        XCTAssertTrue(store.hasPlus)
        XCTAssertEqual(store.message, "Plus restored.")
    }

    @MainActor func testStoreFailureAfterRestoreRemainsVisible() async throws {
        let session = try await restoreSession()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        _ = try await session.buyProduct(identifier: PurchaseStore.plusID)
        let store = isolatedPurchaseStore()
        await store.restore()
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .loadProducts)
        await store.load()
        XCTAssertTrue(store.hasPlus)
        XCTAssertEqual(store.message, "Could not load the store. Check your connection and try again.")
    }

    @MainActor func testExplicitRestoreClearsEarlierStoreLoadFailure() async throws {
        let session = try await restoreSession()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        _ = try await session.buyProduct(identifier: PurchaseStore.plusID)
        let store = isolatedPurchaseStore()
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .loadProducts)
        await store.load()
        XCTAssertEqual(store.message, "Could not load the store. Check your connection and try again.")
        session.resetToDefaultState()
        session.disableDialogs = true
        await store.restore()
        XCTAssertTrue(store.hasPlus)
        XCTAssertEqual(store.message, "Plus restored.")
    }

    @MainActor func testRevocationClearsOwnershipConfirmation() async throws {
        let session = try await restoreSession()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let transaction = try await session.buyProduct(identifier: PurchaseStore.plusID)
        let store = isolatedPurchaseStore()
        await store.restore()
        XCTAssertEqual(store.message, "Plus restored.")
        try session.refundTransaction(identifier: UInt(transaction.id))
        for _ in 0..<50 {
            await store.refreshEntitlements()
            if !store.hasPlus { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTAssertFalse(store.hasPlus)
        XCTAssertNil(store.message, "Revoked access must not retain an ownership confirmation")
    }

    @MainActor func testExplicitRestoreWithoutOwnershipDoesNotGrantPlus() async throws {
        let session = try await restoreSession()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = isolatedPurchaseStore()
        var events = [[String: String]]()
        store.onGrowthEvent = { events.append($0.payload) }
        await store.restore()
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertEqual(store.message, "No Plus purchase was found for this Apple Account.")
        XCTAssertEqual(events, [["eventType": "plus_restore_empty"]])
    }

    @MainActor func testRestoreFailureReleasesBusyAndCanRecover() async throws {
        let session = try await restoreSession()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = isolatedPurchaseStore(monitorsStoreKit: false)
        XCTAssertFalse(store.hasPlus, "A failed-restore test must begin without StoreKit ownership.")
        var events = [[String: String]]()
        store.onGrowthEvent = { events.append($0.payload) }
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .appStoreSync)
        await store.restore()
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertEqual(store.message, "Could not restore purchases. Please try again.")
        session.resetToDefaultState()
        session.disableDialogs = true
        let transaction = try await session.buyProduct(identifier: PurchaseStore.plusID)
        await transaction.finish()
        // Without the StoreKit monitor, nothing waits for the local test server to
        // publish the new purchase. Establish ownership before testing recovery.
        try await waitForPlusEntitlement(present: true)
        await store.restore()
        XCTAssertTrue(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertEqual(store.message, "Plus restored.")
        XCTAssertEqual(events, [
            ["eventType": "plus_restore_failed"],
            ["eventType": "plus_restore_completed"],
        ])
    }

    @MainActor func testRestoreNetworkFailurePreservesVerifiedAccess() async throws {
        let session = try await restoreSession()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        _ = try await session.buyProduct(identifier: PurchaseStore.plusID)
        let store = isolatedPurchaseStore()
        await store.refreshEntitlements()
        XCTAssertTrue(store.hasPlus)
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .appStoreSync)
        await store.restore()
        XCTAssertTrue(store.hasPlus, "A failed sync must not revoke already verified ownership")
        XCTAssertFalse(store.busy)
        XCTAssertEqual(store.message, "Could not restore purchases. Please try again.")
    }

    @MainActor func testUnverifiedPurchaseAndRestoreNeverGrantPlus() async throws {
        let session = try await restoreSession()
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = isolatedPurchaseStore()
        var events = [[String: String]]()
        store.onGrowthEvent = { events.append($0.payload) }
        await store.load()
        try await session.setSimulatedError(.verification(.invalidSignature), forAPI: .verification)
        await store.purchase(source: .freeSample)
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertEqual(store.message, "Apple could not verify this purchase. Try Restore purchases.")
        XCTAssertFalse(session.allTransactions().isEmpty, "A real StoreKit test transaction must exist; an absent product would not exercise verification")
        await store.refreshEntitlements()
        XCTAssertFalse(store.hasPlus)
        await store.restore()
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertEqual(events, [
            ["eventType": "plus_purchase_started", "source": "free_sample"],
            ["eventType": "plus_purchase_unverified", "source": "free_sample"],
            ["eventType": "plus_restore_empty"],
        ])
    }
}
