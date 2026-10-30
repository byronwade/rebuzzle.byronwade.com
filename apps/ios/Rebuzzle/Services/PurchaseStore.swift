import Foundation
import Observation
import StoreKit

@MainActor @Observable final class PurchaseStore {
    static let plusID = "com.byronwade.rebuzzle.plus"
    private(set) var product: Product?
    private(set) var hasPlus = false
    private(set) var plusTransactionJWS: String?
    private(set) var busy = false
    private var storeMessage: String?
    private enum ActionStatus {
        case ownershipConfirmed(String)
        case notice(String)

        var text: String {
            switch self {
            case .ownershipConfirmed(let text), .notice(let text): text
            }
        }
    }
    private var actionStatus: ActionStatus?
    var message: String? { storeMessage ?? actionStatus?.text }
    @ObservationIgnored var onGrowthEvent: ((GrowthEvent) -> Void)?
    @ObservationIgnored var onPlusActivated: (() -> Void)?
    @ObservationIgnored var purchaseAccountIDProvider: (() -> String?)?
    @ObservationIgnored var onVerifiedPurchase: ((GrowthEvent, String) async -> Bool)?
    @ObservationIgnored var purchaseOperationForTesting: ((Product) async throws -> Product.PurchaseResult)?
    @ObservationIgnored private let defaults: UserDefaults
    private var awaitingApproval: Bool {
        get { defaults.bool(forKey: Self.awaitingApprovalDefaultsKey) }
        set { defaults.set(newValue, forKey: Self.awaitingApprovalDefaultsKey) }
    }
    private var awaitingApprovalAccountID: String? {
        get { defaults.string(forKey: Self.awaitingApprovalAccountIDDefaultsKey) }
        set {
            if let newValue { defaults.set(newValue, forKey: Self.awaitingApprovalAccountIDDefaultsKey) }
            else { defaults.removeObject(forKey: Self.awaitingApprovalAccountIDDefaultsKey) }
        }
    }
    private var awaitingApprovalSource: PlusOfferSource? {
        get { defaults.string(forKey: Self.awaitingApprovalSourceDefaultsKey).flatMap(PlusOfferSource.init(rawValue:)) }
        set {
            if let newValue { defaults.set(newValue.rawValue, forKey: Self.awaitingApprovalSourceDefaultsKey) }
            else { defaults.removeObject(forKey: Self.awaitingApprovalSourceDefaultsKey) }
        }
    }
    private var verifiedPurchaseAttributionPending: Bool {
        get { defaults.bool(forKey: Self.verifiedPurchaseAttributionPendingDefaultsKey) }
        set { defaults.set(newValue, forKey: Self.verifiedPurchaseAttributionPendingDefaultsKey) }
    }
    private var verifiedPurchaseAttributionAccountID: String? {
        get { defaults.string(forKey: Self.verifiedPurchaseAttributionAccountIDDefaultsKey) }
        set {
            if let newValue { defaults.set(newValue, forKey: Self.verifiedPurchaseAttributionAccountIDDefaultsKey) }
            else { defaults.removeObject(forKey: Self.verifiedPurchaseAttributionAccountIDDefaultsKey) }
        }
    }
    private var verifiedPurchaseAttributionSource: PlusOfferSource? {
        get { defaults.string(forKey: Self.verifiedPurchaseAttributionSourceDefaultsKey).flatMap(PlusOfferSource.init(rawValue:)) }
        set {
            if let newValue { defaults.set(newValue.rawValue, forKey: Self.verifiedPurchaseAttributionSourceDefaultsKey) }
            else { defaults.removeObject(forKey: Self.verifiedPurchaseAttributionSourceDefaultsKey) }
        }
    }
    @ObservationIgnored private var updates: Task<Void, Never>?
    @ObservationIgnored private var reportingVerifiedPurchase = false
    @ObservationIgnored private var retryVerifiedPurchaseAfterCurrentAttempt = false
    private static let awaitingApprovalDefaultsKey = "com.byronwade.rebuzzle.plus.awaitingApproval.v1"
    private static let awaitingApprovalAccountIDDefaultsKey = "com.byronwade.rebuzzle.plus.awaitingApprovalAccountID.v1"
    private static let awaitingApprovalSourceDefaultsKey = "com.byronwade.rebuzzle.plus.awaitingApprovalSource.v1"
    private static let verifiedPurchaseAttributionPendingDefaultsKey = "com.byronwade.rebuzzle.plus.verifiedAttributionPending.v1"
    private static let verifiedPurchaseAttributionAccountIDDefaultsKey = "com.byronwade.rebuzzle.plus.verifiedAttributionAccountID.v1"
    private static let verifiedPurchaseAttributionSourceDefaultsKey = "com.byronwade.rebuzzle.plus.verifiedAttributionSource.v1"

    /// Set `monitorsStoreKit` to false only for tests that need deterministic explicit StoreKit calls.
    init(defaults: UserDefaults = .standard, monitorsStoreKit: Bool = true) {
        self.defaults = defaults
        // Older builds persisted pending flags without the initiating app account.
        // Drop that ambiguous attribution rather than assigning it to a later login.
        if awaitingApproval, awaitingApprovalAccountID == nil {
            awaitingApproval = false
            awaitingApprovalSource = nil
        }
        if verifiedPurchaseAttributionPending, verifiedPurchaseAttributionAccountID == nil {
            verifiedPurchaseAttributionPending = false
            verifiedPurchaseAttributionSource = nil
        }
        guard monitorsStoreKit else { return }
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                if case .verified(let transaction) = result {
                    if transaction.productID == Self.plusID, self.awaitingApproval {
                        let accountID = self.awaitingApprovalAccountID
                        let source = self.awaitingApprovalSource
                        self.awaitingApproval = false
                        self.awaitingApprovalAccountID = nil
                        self.awaitingApprovalSource = nil
                        if let accountID {
                            self.verifiedPurchaseAttributionAccountID = accountID
                            self.verifiedPurchaseAttributionSource = source
                            self.verifiedPurchaseAttributionPending = true
                            self.onGrowthEvent?(.plusPurchaseVerified(source))
                        }
                    }
                    await self.refreshEntitlements()
                    await transaction.finish()
                    self.retryPendingPurchaseAttribution()
                }
            }
        }
        Task { [weak self] in await self?.refreshEntitlements() }
    }

    deinit {
        updates?.cancel()
    }

    func load() async {
        await refreshEntitlements()
        do {
            product = try await Product.products(for: [Self.plusID]).first
            storeMessage = product == nil ? "Plus isn’t available in the store right now. Daily play is always free." : nil
        } catch { storeMessage = "Could not load the store. Check your connection and try again." }
    }

    /// Reports a verified purchase after the app has restored an authenticated identity.
    /// The marker survives app termination and is cleared only after the server accepts it.
    func retryPendingPurchaseAttribution() {
        guard verifiedPurchaseAttributionPending else { return }
        guard let accountID = verifiedPurchaseAttributionAccountID else {
            verifiedPurchaseAttributionPending = false
            verifiedPurchaseAttributionSource = nil
            return
        }
        guard !reportingVerifiedPurchase else {
            retryVerifiedPurchaseAfterCurrentAttempt = true
            return
        }
        reportingVerifiedPurchase = true
        let source = verifiedPurchaseAttributionSource
        Task { [weak self] in
            guard let self else { return }
            let delivered = await self.onVerifiedPurchase?(.plusPurchaseVerified(source), accountID) ?? false
            if delivered,
               self.verifiedPurchaseAttributionAccountID == accountID,
               self.verifiedPurchaseAttributionSource == source {
                self.verifiedPurchaseAttributionPending = false
                self.verifiedPurchaseAttributionAccountID = nil
                self.verifiedPurchaseAttributionSource = nil
            }
            self.reportingVerifiedPurchase = false
            if self.retryVerifiedPurchaseAfterCurrentAttempt {
                self.retryVerifiedPurchaseAfterCurrentAttempt = false
                self.retryPendingPurchaseAttribution()
            }
        }
    }
    func refreshEntitlements() async {
        let wasActive = hasPlus
        var active = false
        var activeTransactionJWS: String?
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               transaction.productID == Self.plusID, transaction.revocationDate == nil {
                active = true
                if activeTransactionJWS == nil { activeTransactionJWS = result.jwsRepresentation }
            }
        }
        hasPlus = active
        plusTransactionJWS = activeTransactionJWS
        if active && !wasActive { onPlusActivated?() }
        if !active, case .ownershipConfirmed = actionStatus { actionStatus = nil }
    }
    func purchase(source: PlusOfferSource) async {
        guard let product, !busy else { return }
        let purchaseAccountID = purchaseAccountIDProvider?()
        busy = true; actionStatus = nil; storeMessage = nil
        defer { busy = false }
        onGrowthEvent?(.plusPurchaseStarted(source))
        do {
            let purchaseResult: Product.PurchaseResult
            if let purchaseOperationForTesting {
                purchaseResult = try await purchaseOperationForTesting(product)
            } else {
                purchaseResult = try await product.purchase()
            }
            switch purchaseResult {
            case .success(let result):
                guard case .verified(let transaction) = result else {
                    onGrowthEvent?(.plusPurchaseUnverified(source))
                    actionStatus = .notice("Apple could not verify this purchase. Try Restore purchases."); return
                }
                awaitingApproval = false
                awaitingApprovalAccountID = nil
                awaitingApprovalSource = nil
                verifiedPurchaseAttributionAccountID = purchaseAccountID
                verifiedPurchaseAttributionSource = purchaseAccountID == nil ? nil : source
                verifiedPurchaseAttributionPending = purchaseAccountID != nil
                onGrowthEvent?(.plusPurchaseVerified(source))
                await refreshEntitlements()
                await transaction.finish()
                retryPendingPurchaseAttribution()
                actionStatus = hasPlus ? .ownershipConfirmed("Welcome to Plus. Your journal is ready.") : .notice("Purchase received. Try restoring purchases to refresh access.")
            case .pending:
                awaitingApproval = true
                awaitingApprovalAccountID = purchaseAccountID
                awaitingApprovalSource = source
                onGrowthEvent?(.plusPurchasePending(source))
                actionStatus = .notice("Your purchase is awaiting approval. Plus will unlock when Apple confirms it.")
            case .userCancelled:
                onGrowthEvent?(.plusPurchaseCancelled(source))
            @unknown default:
                onGrowthEvent?(.plusPurchaseFailed(source))
                actionStatus = .notice("The purchase could not be completed. Try again.")
            }
        } catch {
            onGrowthEvent?(.plusPurchaseFailed(source))
            actionStatus = .notice("The purchase could not be completed. You can try again or restore purchases.")
        }
    }
    func restore() async {
        guard !busy else { return }
        busy = true; actionStatus = nil; storeMessage = nil
        defer { busy = false }
        do {
            try await AppStore.sync()
            await refreshEntitlements()
            if hasPlus {
                onGrowthEvent?(.plusRestoreCompleted)
                actionStatus = .ownershipConfirmed("Plus restored.")
            } else {
                onGrowthEvent?(.plusRestoreEmpty)
                actionStatus = .notice("No Plus purchase was found for this Apple Account.")
            }
        } catch {
            onGrowthEvent?(.plusRestoreFailed)
            actionStatus = .notice("Could not restore purchases. Please try again.")
        }
    }
}
