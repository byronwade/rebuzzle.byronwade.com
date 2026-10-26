import Foundation
import Observation
import StoreKit

@MainActor @Observable final class PurchaseStore {
    static let plusID = "com.byronwade.rebuzzle.plus"
    private(set) var product: Product?
    private(set) var hasPlus = false
    private(set) var busy = false
    var message: String?
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
            message = product == nil ? "Plus isn’t available in the store right now. Daily play is always free." : nil
        } catch { message = "Could not load the store. Check your connection and try again." }
    }
    func refreshEntitlements() async {
        var active = false
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               transaction.productID == Self.plusID, transaction.revocationDate == nil { active = true }
        }
        hasPlus = active
    }
    func purchase() async {
        guard let product, !busy else { return }
        busy = true; message = nil
        defer { busy = false }
        do {
            switch try await product.purchase() {
            case .success(let result):
                guard case .verified(let transaction) = result else {
                    message = "Apple could not verify this purchase. Try Restore purchases."; return
                }
                await refreshEntitlements()
                await transaction.finish()
                message = hasPlus ? "Welcome to Plus. Your journal is ready." : "Purchase received. Try restoring purchases to refresh access."
            case .pending: message = "Your purchase is awaiting approval. Plus will unlock when Apple confirms it."
            case .userCancelled: break
            @unknown default: message = "The purchase could not be completed. Try again."
            }
        } catch { message = "The purchase could not be completed. You can try again or restore purchases." }
    }
    func restore() async {
        guard !busy else { return }
        busy = true; defer { busy = false }
        do {
            try await AppStore.sync()
            await refreshEntitlements()
            message = hasPlus ? "Plus restored." : "No Plus purchase was found for this Apple Account."
        } catch { message = "Could not restore purchases. Please try again." }
    }
}
