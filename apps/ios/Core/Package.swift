// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "RebuzzleCore", platforms: [.iOS(.v18), .macOS(.v14)], products: [.library(name: "RebuzzleCore", targets: ["RebuzzleCore"])], targets: [.target(name: "RebuzzleCore"), .testTarget(name: "RebuzzleCoreTests", dependencies: ["RebuzzleCore"])])
