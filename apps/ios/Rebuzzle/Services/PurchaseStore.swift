import Foundation
import Observation
import StoreKit

@MainActor @Observable final class PurchaseStore {
    static let plusID = "com.byronwade.rebuzzle.plus"
    private(set) var product: Product?
    private(set) var hasPlus = false
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
    @ObservationIgnored private var updates: Task<Void, Never>?
    init() {
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                if case .verified(let transaction) = result {
                    await self.refreshEntitlements()
                    await transaction.finish()
                }
            }
        }
    }
    func load() async {
        await refreshEntitlements()
        do {
            product = try await Product.products(for: [Self.plusID]).first
            storeMessage = product == nil ? "Plus isn’t available in the store right now. Daily play is always free." : nil
        } catch { storeMessage = "Could not load the store. Check your connection and try again." }
    }
    func refreshEntitlements() async {
        var active = false
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               transaction.productID == Self.plusID, transaction.revocationDate == nil { active = true }
        }
        hasPlus = active
        if !active, case .ownershipConfirmed = actionStatus { actionStatus = nil }
    }
    func purchase() async {
        guard let product, !busy else { return }
        busy = true; actionStatus = nil; storeMessage = nil
        defer { busy = false }
        do {
            switch try await product.purchase() {
            case .success(let result):
                guard case .verified(let transaction) = result else {
                    actionStatus = .notice("Apple could not verify this purchase. Try Restore purchases."); return
                }
                await refreshEntitlements()
                await transaction.finish()
                actionStatus = hasPlus ? .ownershipConfirmed("Welcome to Plus. Your journal is ready.") : .notice("Purchase received. Try restoring purchases to refresh access.")
            case .pending: actionStatus = .notice("Your purchase is awaiting approval. Plus will unlock when Apple confirms it.")
            case .userCancelled: break
            @unknown default: actionStatus = .notice("The purchase could not be completed. Try again.")
            }
        } catch { actionStatus = .notice("The purchase could not be completed. You can try again or restore purchases.") }
    }
    func restore() async {
        guard !busy else { return }
        busy = true; actionStatus = nil; storeMessage = nil
        defer { busy = false }
        do {
            try await AppStore.sync()
            await refreshEntitlements()
            actionStatus = hasPlus ? .ownershipConfirmed("Plus restored.") : .notice("No Plus purchase was found for this Apple Account.")
        } catch { actionStatus = .notice("Could not restore purchases. Please try again.") }
    }
}
