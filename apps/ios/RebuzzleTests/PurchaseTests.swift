import XCTest
import StoreKitTest
@testable import Rebuzzle

final class PurchaseTests: XCTestCase {
    @MainActor private func isolatedPurchaseStore() -> PurchaseStore {
        PurchaseStore(defaults: UserDefaults(suiteName: "rebuzzle.purchase-tests.\(UUID().uuidString)")!)
    }

    @MainActor func testVerifiedPurchaseGrantsAccessAndRefundRevokesIt() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.disableDialogs = true
        session.clearTransactions()
        try await waitForPlusEntitlement(present: false)
        defer { session.clearTransactions() }
        let store = isolatedPurchaseStore()
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
        let relaunched = isolatedPurchaseStore()
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
        try await waitForPlusEntitlement(present: false)
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = isolatedPurchaseStore()
        var events = [[String: String]]()
        store.onGrowthEvent = { events.append($0.payload) }
        store.purchaseAccountIDProvider = { "member-a" }
        store.onVerifiedPurchase = { _, accountID in accountID == "member-a" }
        await store.load()
        await store.purchase(source: .settings)
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertTrue(store.message?.contains("awaiting approval") == true)
        XCTAssertEqual(events, [
            ["eventType": "plus_purchase_started", "source": "settings"],
            ["eventType": "plus_purchase_pending", "source": "settings"],
        ])
        let pending = try XCTUnwrap(session.allTransactions().first)
        try session.approveAskToBuyTransaction(identifier: pending.identifier)
        for _ in 0..<50 {
            if store.hasPlus && events.contains(["eventType": "plus_purchase_verified", "source": "settings"]) { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTAssertTrue(store.hasPlus, "Transaction updates unlock the approved purchase without relaunch")
        XCTAssertEqual(events, [
            ["eventType": "plus_purchase_started", "source": "settings"],
            ["eventType": "plus_purchase_pending", "source": "settings"],
            ["eventType": "plus_purchase_verified", "source": "settings"],
        ])
    }

    @MainActor func testAskToBuyApprovalAfterPurchaseStoreRecreationReportsVerified() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.askToBuyEnabled = true
        session.clearTransactions()
        try await waitForPlusEntitlement(present: false)
        let suiteName = "rebuzzle.purchase-tests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer {
            session.clearTransactions()
            session.resetToDefaultState()
            defaults.removePersistentDomain(forName: suiteName)
        }

        var firstStore: PurchaseStore? = PurchaseStore(defaults: defaults)
        var firstEvents = [[String: String]]()
        firstStore?.purchaseAccountIDProvider = { "member-a" }
        firstStore?.onGrowthEvent = { firstEvents.append($0.payload) }
        await firstStore?.load()
        await firstStore?.purchase(source: .freeSample)
        XCTAssertEqual(firstEvents, [
            ["eventType": "plus_purchase_started", "source": "free_sample"],
            ["eventType": "plus_purchase_pending", "source": "free_sample"],
        ])
        let pending = try XCTUnwrap(session.allTransactions().first)

        // The original store is released as if the app process had ended.
        firstStore = nil
        try session.approveAskToBuyTransaction(identifier: pending.identifier)

        // StoreKit must replay the unfinished approval to the new launch listener.
        let relaunchedStore = PurchaseStore(defaults: defaults)
        var reportedEvents = [[String: String]]()
        var currentAccountID = "member-b"
        var rejectedForWrongAccount = false
        relaunchedStore.purchaseAccountIDProvider = { currentAccountID }
        relaunchedStore.onVerifiedPurchase = { event, attributionAccountID in
            guard currentAccountID == attributionAccountID else {
                rejectedForWrongAccount = true
                return false
            }
            reportedEvents.append(event.payload)
            return true
        }
        for _ in 0..<50 {
            if rejectedForWrongAccount { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTAssertTrue(rejectedForWrongAccount, "A purchase must not be attributed to a different signed-in app account.")

        currentAccountID = "member-a"
        relaunchedStore.retryPendingPurchaseAttribution()
        for _ in 0..<50 {
            if relaunchedStore.hasPlus && reportedEvents.contains(["eventType": "plus_purchase_verified", "source": "free_sample"]) {
                break
            }
            try await Task.sleep(for: .milliseconds(100))
        }

        XCTAssertTrue(relaunchedStore.hasPlus)
        XCTAssertEqual(reportedEvents, [["eventType": "plus_purchase_verified", "source": "free_sample"]])
    }

    @MainActor func testLegacyAskToBuyApprovalStaysSourceFreeAfterPurchaseStoreRecreation() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.askToBuyEnabled = true
        session.clearTransactions()
        try await waitForPlusEntitlement(present: false)
        let suiteName = "rebuzzle.purchase-tests.legacy-ask-to-buy.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer {
            session.clearTransactions()
            session.resetToDefaultState()
            defaults.removePersistentDomain(forName: suiteName)
        }

        var firstStore: PurchaseStore? = PurchaseStore(defaults: defaults)
        firstStore?.purchaseAccountIDProvider = { "member-a" }
        await firstStore?.load()
        await firstStore?.purchase(source: .journal)
        let pending = try XCTUnwrap(session.allTransactions().first)

        // Simulate a pending record written by a build that had no source key.
        defaults.removeObject(forKey: "com.byronwade.rebuzzle.plus.awaitingApprovalSource.v1")
        firstStore = nil
        try session.approveAskToBuyTransaction(identifier: pending.identifier)

        let relaunchedStore = PurchaseStore(defaults: defaults)
        var reportedEvents = [[String: String]]()
        relaunchedStore.onVerifiedPurchase = { event, accountID in
            guard accountID == "member-a" else { return false }
            reportedEvents.append(event.payload)
            return true
        }
        for _ in 0..<50 {
            if relaunchedStore.hasPlus && !reportedEvents.isEmpty { break }
            try await Task.sleep(for: .milliseconds(100))
        }

        XCTAssertTrue(relaunchedStore.hasPlus)
        XCTAssertEqual(reportedEvents, [["eventType": "plus_purchase_verified"]])
    }

    @MainActor func testLegacyPendingVerifiedAttributionStaysSourceFree() async throws {
        let suiteName = "rebuzzle.purchase-tests.legacy.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }
        defaults.set(true, forKey: "com.byronwade.rebuzzle.plus.verifiedAttributionPending.v1")
        defaults.set("member-a", forKey: "com.byronwade.rebuzzle.plus.verifiedAttributionAccountID.v1")

        let store = PurchaseStore(defaults: defaults)
        var reportedEvents = [[String: String]]()
        store.onVerifiedPurchase = { event, _ in
            reportedEvents.append(event.payload)
            return true
        }
        store.retryPendingPurchaseAttribution()
        for _ in 0..<50 where reportedEvents.isEmpty {
            try await Task.sleep(for: .milliseconds(10))
        }

        XCTAssertEqual(reportedEvents, [["eventType": "plus_purchase_verified"]])
    }

    @MainActor func testFailedPurchaseKeepsFreeAccessAndAllowsAnotherAttempt() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Rebuzzle", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        try await waitForPlusEntitlement(present: false)
        defer { session.clearTransactions(); session.resetToDefaultState() }
        let store = isolatedPurchaseStore()
        var attempts = 0
        store.purchaseOperationForTesting = { _ in
            attempts += 1
            throw URLError(.notConnectedToInternet)
        }
        await store.load()
        XCTAssertNotNil(store.product)
        await store.purchase(source: .archive)
        XCTAssertFalse(store.hasPlus)
        XCTAssertFalse(store.busy)
        XCTAssertNotNil(store.message)
        XCTAssertEqual(attempts, 1)
        await store.purchase(source: .archive)
        XCTAssertFalse(store.busy)
        XCTAssertFalse(store.hasPlus)
        XCTAssertEqual(attempts, 2, "A failed purchase releases the busy gate so another attempt can run")
    }
}
